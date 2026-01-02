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

class ChatRequest(BaseModel):
    message: str
    context: str = ""
    temperature: float = 0.7

class AnalyzeEntitiesRequest(BaseModel):
    text: str

@app.on_event("startup")
def load_model():
    global model, tokenizer
    print(f"🧠 Loading AI Model: {MODEL_ID}...")
    start = time.time()
    model, tokenizer = load(MODEL_ID)
    print(f"✅ Model loaded in {time.time() - start:.2f}s")

@app.post("/chat")
async def chat(request: ChatRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    # 🧠 ONE-SHOT PROMPTING STRATEGY
    # Show, don't just tell. We give an example of the desired style.
    
    system_instruction = (
        "Ти — професійний український письменник. Твій стиль: атмосферний, художній, але чіткий. "
        "Ти пишеш виключно українською мовою. Уникай повторів."
    )

    example_input = "Опиши старий київський трамвай."
    example_output = (
        "Старий червоний трамвай повз по рейках Подолу, наче втомлений велетень. "
        "Його колеса виспівували тужливу пісню металу об метал, а вікна деренчали, "
        "відбиваючи вечірні вогні міста. Всередині пахло пилом і старим деревом."
    )

    # Building the Prompt with Example
    prompt = (
        f"[INST] {system_instruction}\n\n"
        f"Приклад:\nКористувач: {example_input}\nВідповідь: {example_output}\n\n"
        f"Поточне завдання:\nКонтекст: {request.context}\nКористувач: {request.message} [/INST]"
    )
    
    print(f"📩 Generating response for: {request.message} (Temp: {request.temperature})")
    
    # Using Sampler for creativity
    sampler = make_sampler(temp=request.temperature, top_p=0.9)
    
    response = generate(
        model, 
        tokenizer, 
        prompt=prompt, 
        max_tokens=800, 
        verbose=False, 
        sampler=sampler
    )
    
    return {"reply": response}

@app.post("/analyze-entities")
async def analyze_entities(request: AnalyzeEntitiesRequest):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    
    system_instruction = (
        "Ти — експертний літературний помічник. Твоє завдання — витягти унікальних персонажів та локації з наданого тексту. "
        "Поверни результат ТІЛЬКИ як JSON масив об'єктів. "
        "Кожен об'єкт повинен мати: 'name' (ім'я), 'type' (суворо 'CHARACTER' або 'LOCATION'), та 'description' (короткий опис українською мовою на основі тексту). "
        "Не вигадуй інформацію. Якщо текст порожній або сутностей немає, поверни []."
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
