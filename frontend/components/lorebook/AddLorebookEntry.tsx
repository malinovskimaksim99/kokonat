"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AddLorebookEntry({
    open,
    onClose,
    projectId,
    onSuccess
}: {
    open: boolean;
    onClose: () => void;
    projectId: string;
    onSuccess: () => void;
}) {
    const [name, setName] = useState("");
    const [type, setType] = useState("CHARACTER");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("Active");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        await fetch("/api/lorebook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, type, description, status, projectId }),
        });
        setLoading(false);
        onSuccess();
        onClose();
        setName("");
        setDescription("");
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-[#020617] border border-slate-800 text-slate-50 sm:max-w-md shadow-2xl z-[100]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">
                        Додати Елемент Світу
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-200">Назва / Ім'я</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-base"
                            placeholder="Наприклад: Джон, Київ, Екскалібур"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-200">Тип</label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                                    <SelectItem value="CHARACTER">Персонаж</SelectItem>
                                    <SelectItem value="LOCATION">Локація</SelectItem>
                                    <SelectItem value="EVENT">Подія</SelectItem>
                                    <SelectItem value="ITEM">Предмет</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-200">Статус</label>
                            <Input
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 text-base"
                                placeholder="Живий, Зруйновано..."
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-200">Опис (Контекст для ШІ)</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 h-32 text-base resize-none custom-scrollbar"
                            placeholder="Опишіть зовнішність, характер або історію. Агент використовуватиме це."
                        />
                    </div>
                </div>
                <DialogFooter className="gap-3 sm:gap-0">
                    <Button variant="outline" onClick={onClose} className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">Скасувати</Button>
                    <Button onClick={handleSubmit} disabled={loading || !name} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                        {loading ? "Збереження..." : "Додати"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
