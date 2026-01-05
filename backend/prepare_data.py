import os
import json
import random

def prepare_data(source_file, output_dir, chunk_size=512):
    print(f"📖 Reading {source_file}...")
    
    with open(source_file, 'r', encoding='utf-8') as f:
        text = f.read()

    # Simple cleaning
    text = text.replace('\r\n', '\n')
    
    # Split into chunks
    chunks = []
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i + chunk_size]
        # Only keep chunks that are substantial enough
        if len(chunk) > 500:
            chunks.append({"text": chunk})

    print(f"🧩 Created {len(chunks)} chunks.")

    # Shuffle and Split
    random.shuffle(chunks)
    split_idx = int(len(chunks) * 0.9) # 90% train, 10% valid
    train_data = chunks[:split_idx]
    valid_data = chunks[split_idx:]

    # Save
    with open(os.path.join(output_dir, "train.jsonl"), 'w', encoding='utf-8') as f:
        for entry in train_data:
            json.dump(entry, f, ensure_ascii=False)
            f.write('\n')
            
    with open(os.path.join(output_dir, "valid.jsonl"), 'w', encoding='utf-8') as f:
        for entry in valid_data:
            json.dump(entry, f, ensure_ascii=False)
            f.write('\n')

    print(f"✅ Saved: {len(train_data)} training samples, {len(valid_data)} validation samples.")

if __name__ == "__main__":
    SOURCE = "training_data/Негідник.txt"
    OUTPUT = "training_data"
    
    if os.path.exists(SOURCE):
        prepare_data(SOURCE, OUTPUT)
    else:
        print(f"❌ File not found: {SOURCE}")
