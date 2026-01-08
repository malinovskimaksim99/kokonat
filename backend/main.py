from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import time
from mlx_lm import load, generate
from mlx_lm.sample_utils import make_sampler

app = FastAPI()

# Allow Frontend to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model State
MODEL_ID = "mlx-community/Mistral-Nemo-Instruct-2407-4bit"
model = None
tokenizer = None

from typing import List, Dict

class ChatRequest(BaseModel):
    message: str
    context: str = ""
    world_bible: str = ""
    graph_context: str = "" # Summary of graph events
    history: List[Dict[str, str]] = []
    temperature: float = 0.7

class AnalyzeEntitiesRequest(BaseModel):
    text: str

@app.on_event("startup")
def load_model():
    global model, tokenizer
    print(f"🧠 Loading AI Model: {MODEL_ID}...")
    start = time.time()
    # Load Model & Tokenizer (Mistral-Nemo-Instruct-2407 + LoRA Adapters)
    model, tokenizer = load(
        MODEL_ID,
        tokenizer_config={"trust_remote_code": True}
    )
    print(f"✅ Model loaded in {time.time() - start:.2f}s")

from fastapi.responses import StreamingResponse
import json
from mlx_lm import stream_generate

@app.post("/chat")
async def chat(request: ChatRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    # 🧠 SYSTEM PROMPT
    # 🧠 SYSTEM PROMPT V3 (Strict & Intelligent)
    system_instruction = """
Ти — елітний літературний редактор та співавтор (AI Writer Agent). Твоя спеціалізація — художня література українською мовою.

[ТВОЇ ІНСТРУМЕНТИ ТА КОНТЕКСТ]
1. Ти бачиш останні 70 повідомлень чату (твоя "короткочасна пам'ять").
2. Ти бачиш текст поточного розділу (якщо надано).
3. Ти бачиш "Павутину Сюжету" (Граф подій) — це твоя "довготривала пам'ять" про минуле.
4. Ти НЕ можеш керувати файлами напряму, але можеш радити користувачу, що змінити.

"""

    # Inject World Bible if present
    if request.world_bible:
        system_instruction += f"""
[СЮЖЕТ ТА ПРАВИЛА СВІТУ (WORLD BIBLE)]
Увага! Тобі надано доступ до "Біблії Світу". Це джерело абсолютної правди.
Використовуй ці факти (імена, локації, магію, правила), коли пишеш або відповідаєш.
Не вигадуй нічого, що суперечить цьому тексту.

<WORLD_BIBLE>
{request.world_bible}
</WORLD_BIBLE>
"""

    # Inject Graph Context (Memory) if present
    if request.graph_context:
        system_instruction += f"""
[ІСТОРІЯ ПОДІЙ (ГРАФ)]
Це хронологія важливих подій, що вже сталися в книзі. Використовуй це, щоб пам'ятати минуле.
<STORY_GRAPH>
{request.graph_context}
</STORY_GRAPH>
"""

    system_instruction += """
[ПРОТОКОЛ ЧЕСНОСТІ (HONESTY PROTOCOL)]
- Якщо ти не знаєш відповіді — скажи прямо. Не вигадуй факти, яких немає в контексті (галюцинації).
- Якщо користувач просить дію, яку ти не можеш виконати (наприклад, "видали файл"), поясни, що це має зробити він через інтерфейс.

[ТВОЯ РОЛЬ: СПІВАВТОР (CO-AUTHOR)]
- Не будь пасивним. Якщо ти бачиш сюжетну діру — вкажи на неї.
- Пропонуй альтернативи. "А що, якби герой вчинив інакше?"
- Твій тон: професійний, надихаючий, але критичний до якості тексту.

[ФОРМАТ ВІДПОВІДІ]
- > Текст історії пиши так (цитуванням).
- Аналітику та поради пиши звичайним текстом.
- Діалоги оформлюй через довге тире (—).

Твоя мета — допомогти користувачу написати бестселер.
"""
    example_input = "Опишіть ліс вночі."
    example_output = (
        "> Старезні дуби скрипіли, наче скаржились на холодний вітер. Між їхнім гіллям, схожим на покручені пальці велетнів, пробивалося бліде світло місяця, вихоплюючи з темряви силуети сплячих птахів."
    )

    # Truncate inputs to prevent OOM/Context overflow (Stricter limits)
    safe_message = request.message[:6000] 
    safe_context = request.context[:2500]
    
    # Format History
    history_text = ""
    if request.history:
        history_text = "\nIсторія чату:\n"
        for msg in request.history[-70:]: # Last 70 messages per user request
             role_tag = "Користувач" if msg['role'] == 'user' else "Ти (ШІ)"
             history_text += f"{role_tag}: {msg['content'][:500]}\n" # Truncate individual messages

    # Building the Prompt with Example
    prompt = (
        f"[INST] {system_instruction}\n\n"
        f"Приклад:\nКористувач: {example_input}\nВідповідь: {example_output}\n\n"
        f"Контекст твору (Поточний розділ):\n{safe_context}\n"
        f"{history_text}\n"
        f"Запит користувача: {safe_message} [/INST]"
    )
    
    print(f"📩 Streaming response for message length: {len(safe_message)} (Temp: {request.temperature})")
    
    # Using Sampler for creativity but stability
    # repetition_penalty=1.1 helps prevent loops and gibberish repetition
    sampler = make_sampler(temp=request.temperature, top_p=0.9) 
    
    def generate_stream():
        try:
            # stream_generate yields response objects with 'text' and 'token'
            for response in stream_generate(
                model, 
                tokenizer, 
                prompt=prompt, 
                max_tokens=800, 
                sampler=sampler
            ):
                chunk = response.text
                yield f"{chunk}"
        except Exception as e:
            print(f"❌ Generation Error: {e}")
            yield f"\n[System Error: {str(e)}]"

    return StreamingResponse(generate_stream(), media_type="text/plain")

@app.post("/analyze-entities")
async def analyze_entities(request: AnalyzeEntitiesRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    system_instruction = (
        "Ти — експертний літературний помічник. Твоє завдання — витягти унікальних персонажів та локації з наданого тексту. "
        "Поверни результат ТІЛЬКИ як JSON масив об'єктів. "
        "Кожен об'єкт повинен мати: 'name' (ім'я), 'type' (суворо 'CHARACTER' або 'LOCATION'), та 'description' (короткий опис ВИКЛЮЧНО українською мовою на основі тексту). "
        "Не вигадуй інформацію. Опис не повинен містити англійських слів. Якщо текст порожній або сутностей немає, поверни []."
    )

    prompt = (
        f"[INST] {system_instruction}\n\n"
        f"Текст для аналізу:\n{request.text[:2000]}...\n\n" # Truncate to avoid context limit issues for now
        "Результат JSON масив:[/INST]"
    )
    
    print(f"🔍 Analyzing entities for text length: {len(request.text)}")
    
    # Low temp for deterministic extraction
    sampler = make_sampler(temp=0.1, top_p=0.95)
    
    response = generate(
        model, 
        tokenizer, 
        prompt=prompt, 
        max_tokens=600, 
        verbose=False, 
        sampler=sampler
    )
    
    # Basic cleanup in case model chats a bit (though strict instruction usually works)
    clean_json = response.strip()
    # If model adds ```json ... ``` wrapper
    if "```json" in clean_json:
        clean_json = clean_json.split("```json")[1].split("```")[0].strip()
    elif "```" in clean_json:
         clean_json = clean_json.split("```")[1].split("```")[0].strip()

    return {"raw": response, "json_str": clean_json}

@app.post("/analyze-chapter")
async def analyze_chapter(request: AnalyzeEntitiesRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    system_instruction = (
        "Ти — аналітик художніх творів. Твоє завдання — проаналізувати наданий текст розділу. "
        "Поверни результат ТІЛЬКИ як JSON об'єкт з полями: "
        "'summary' (стислий переказ сюжету розділу, 3-5 речень українською), "
        "'events' (масив рядків, ключові події, що сталися), "
        "'mood' (одним словом: напружений, спокійний, веселий тощо). "
        "Не вигадуй. Якщо текст пустий, поверни пусті значення."
    )

    prompt = (
        f"[INST] {system_instruction}\n\n"
        f"Текст розділу:\n{request.text[:8000]}...\n\n" # Higher limit for chapters
        "Результат JSON:[/INST]"
    )
    
    print(f"📊 Analyzing Chapter length: {len(request.text)}")
    
    sampler = make_sampler(temp=0.2, top_p=0.95)
    
    response = generate(
        model, 
        tokenizer, 
        prompt=prompt, 
        max_tokens=800, 
        verbose=False, 
        sampler=sampler
    )
    
    clean_json = response.strip()
    if "```json" in clean_json:
        clean_json = clean_json.split("```json")[1].split("```")[0].strip()
    elif "```" in clean_json:
         clean_json = clean_json.split("```")[1].split("```")[0].strip()

    return {"raw": response, "json_str": clean_json}

class AnalyzeWorldRequest(BaseModel):
    chapter_text: str
    bible_text: str

@app.post("/analyze-world-update")
async def analyze_world_update(request: AnalyzeWorldRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    # Construct the Archivist Prompt
    prompt = f"""[INST]
Ти — Архіваріус Світу (World Archivist). Твоє завдання — оновити "Біблію Світу" новими фактами з нового розділу.

[ПОТОЧНА БІБЛІЯ]
{request.bible_text}

[НОВИЙ РОЗДІЛ]
{request.chapter_text[:6000]}

[ІНСТРУКЦІЯ]
1. Прочитай Новий Розділ.
2. Знайди факти про світ (персонажі, локації, магія, правила), яких ЩЕ НЕМАЄ в Поточній Біблії.
3. Ігноруй звичайні дії (хто куди пішов), шукай тільки *сталі факти* (зовнішність, історія, закони).
4. Згрупуй їх за секціями Markdown (наприклад: "## Персонажі", "## Магія"). Якщо секції немає — вигадай відповідну.
5. Поверни результат суворо у форматі JSON:
{{
  "updates": [
    {{ "section": "## Назва Секції", "facts": ["Факт 1", "Факт 2"] }}
  ]
}}
Якщо нових фактів немає, поверни порожній список.
Тільки JSON без пояснень.
[/INST]"""
    
    print("🔍 Analyzing World Updates...")
    sampler = make_sampler(temp=0.1, top_p=0.9) # Strict logic

    # Generate
    response = generate(
        model, 
        tokenizer, 
        prompt=prompt, 
        max_tokens=1000, 
        verbose=True, 
        sampler=sampler
    )
    
    # Clean and Parse JSON
    clean_json = response.strip()
    if "```json" in clean_json:
        clean_json = clean_json.split("```json")[1].split("```")[0].strip()
    elif "```" in clean_json:
        clean_json = clean_json.split("```")[1].split("```")[0].strip()
        
    return {"raw": response, "json_str": clean_json}

@app.delete("/projects/{project_id}/chapters/{chapter_id}")
async def delete_chapter(project_id: str, chapter_id: str):
    if project_id not in PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = PROJECTS[project_id]
    initial_len = len(project.chapters)
    project.chapters = [c for c in project.chapters if c.id != chapter_id]
    
    if len(project.chapters) == initial_len:
         raise HTTPException(status_code=404, detail="Chapter not found")
         
    save_data()
    return {"status": "success"}

class AnalyzeGraphRequest(BaseModel):
    chapter_text: str
    existing_nodes_summary: str = "" # Simplified list of previous events for context
    existing_threads: List[str] = [] # List of threads already in the graph

@app.post("/analyze-graph-update")
async def analyze_graph_update(request: AnalyzeGraphRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    # Architect Prompt (Advanced Subway Map Version) - DYNAMIC THREADS
    threads_context = ""
    if request.existing_threads:
        threads_context = f"Вже існуючі лінії: {', '.join(request.existing_threads)}. Використовуй їх, якщо подія пасує."
    else:
        threads_context = "Це перший аналіз, тому створи доречні назви ліній сам."

    prompt = f"""[INST]
Ти — Архітектор Сюжету (Story Graph Architect). Твоє завдання — перетворити текст розділу на вузли графа подій (Story Web).

[КОНТЕКСТ (Останні події)]
{request.existing_nodes_summary if request.existing_nodes_summary else "Це перший розділ."}

[СЮЖЕТНІ ЛІНІЇ]
Ти маєш сам визначити, до якої сюжетної лінії належить подія.
{threads_context}
Якщо подія започатковує нову тему — вигадай нову коротку назву лінії (1-2 слова, наприклад: "Магія", "Інтриги", "Війна", "Романтика").

[ТЕКСТ РОЗДІЛУ]
{request.chapter_text[:8000]}

[ІНСТРУКЦІЯ]
1. Виділи 1-3 ключові події.
2. Для кожної події визнач:
   - "label": Назва події (3-6 слів).
   - "details": Лаконічний, але "живий" опис ключової суті (1-2 речення). Згадай імена, важливі предмети чи емоції.
   - "timeframe": Внутрішній час події (наприклад: "День 1, Ранок", "Через тиждень", "Рік 1050"). Якщо не вказано, логічно виведи з контексту.
   - "thread": Назва сюжетної лінії (використовуй існуючі або створи нову).
   - "importance": Наскільки це важливо для загального сюжету? (1 - деталь, 3 - звичайна подія, 5 - кульмінація/поворот).
   
3. Поверни JSON:
{{
  "newNodes": [
    {{ 
      "label": "...",
        "details": "...",
         "timeframe": "...",
      "thread": "...",
      "importance": 3 
    }}
  ]
}}
Тільки JSON. Без пояснень.
[/INST]"""
    
    print("🕸️ Analyzing Graph Structure (Advanced)...")
    sampler = make_sampler(temp=0.1, top_p=0.9) # Deterministic

    response = generate(
        model, 
        tokenizer, 
        prompt=prompt, 
        max_tokens=800, 
        verbose=True, 
        sampler=sampler
    )
    
    # Clean JSON
    clean_json = response.strip()
    if "```json" in clean_json:
        clean_json = clean_json.split("```json")[1].split("```")[0].strip()
    elif "```" in clean_json:
        clean_json = clean_json.split("```")[1].split("```")[0].strip()
        
    return {"raw": response, "json_str": clean_json}

class ConsistencyRequest(BaseModel):
    chapter_text: str
    lorebook_context: str = ""
    graph_context: str = ""

@app.post("/analyze-consistency")
async def analyze_consistency(request: ConsistencyRequest):
    prompt = f"""[INST]
Ти — Редактор Цілісності (Continuity Editor). Твоє завдання — перевірити текст нового розділу на наявність логічних протиріч із "Біблією Світу" та попередніми подіями.

[БІБЛІЯ СВІТУ (Сущності)]
{request.lorebook_context}

[ПОПЕРЕДНІ ПОДІЇ (Граф)]
{request.graph_context}

[ТЕКСТ НОВОГО РОЗДІЛУ]
{request.chapter_text[:6000]}

[ІНСТРУКЦІЯ]
1. Уважно прочитай текст.
2. Порівняй факти з Біблією Світу та Графом.
3. Шукай:
   - "Мертві" персонажі оживають?
   - Зміна кольору очей/волосся/віку без пояснень?
   - Порушення магічних правил?
   - Герой знає те, чого не може знати (метагеймінг)?
   - Герої телепортуються (порушення хронології)?

4. Для кожної проблеми визнач рівень:
   - "CRITICAL": Ламає сюжет (наприклад, ожив мрець).
   - "WARNING": Підозріло, але можливо (наприклад, дивна поведінка).
   - "NITPICK": Дрібниця (плутанина в одязі).

5. Поверни JSON:
{{
  "issues": [
    {{
      "severity": "CRITICAL",
      "description": "Персонаж Х помер у розділі 5, але тут він п'є каву.",
      "quote": "Х зайшов у кімнату і замовив каву."
    }}
  ]
}}
Якщо проблем немає, поверни порожній масив "issues": [].
Тільки JSON.
[/INST]"""

    response = generate_text(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
        temperature=0.1 # Low temp for strict logic
    )
    
    clean_json = response.strip()
    if "```json" in clean_json:
        clean_json = clean_json.split("```json")[1].split("```")[0].strip()
    elif "```" in clean_json:
        clean_json = clean_json.split("```")[1].split("```")[0].strip()
        
    return {"raw": response, "json_str": clean_json}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
