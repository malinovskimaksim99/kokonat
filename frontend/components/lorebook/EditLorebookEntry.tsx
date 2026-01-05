"use client";

import { useEffect, useState } from "react";
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
import { Trash2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function EditLorebookEntry({
    open,
    onClose,
    entry,
    onSuccess,
    onDelete
}: {
    open: boolean;
    onClose: () => void;
    entry: any; // Using any for simplicity here, ideally LorebookEntry type
    onSuccess: () => void;
    onDelete: () => void;
}) {
    const [name, setName] = useState("");
    const [type, setType] = useState("CHARACTER");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("Active");
    const [loading, setLoading] = useState(false);

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (entry) {
            setName(entry.name);
            setType(entry.type);
            setDescription(entry.description);
            setStatus(entry.status);
        }
    }, [entry]);

    const handleSubmit = async () => {
        if (!entry) return;
        setLoading(true);
        try {
            await fetch(`/api/lorebook/${entry.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, type, description, status }),
            });
            onSuccess();
            onClose();
        } catch (e) {
            console.error("Failed to update", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        // Confirmation is handled by AlertDialog now
        setLoading(true);
        try {
            await fetch(`/api/lorebook/${entry.id}`, {
                method: "DELETE"
            });
            onDelete();
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-[#020617] border-slate-800 text-slate-50 shadow-2xl">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle>Редагувати: {name}</DialogTitle>
                    <Button variant="destructive" size="icon" onClick={() => setShowDeleteConfirm(true)} title="Видалити">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-xs font-medium">Назва / Ім'я</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-neutral-800 border-neutral-700"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Тип</label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="bg-neutral-800 border-neutral-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-800 border-neutral-700">
                                    <SelectItem value="CHARACTER">Персонаж</SelectItem>
                                    <SelectItem value="GOD">Божество</SelectItem>
                                    <SelectItem value="LOCATION">Локація</SelectItem>
                                    <SelectItem value="FACTION">Фракція</SelectItem>
                                    <SelectItem value="EVENT">Подія</SelectItem>
                                    <SelectItem value="ITEM">Предмет</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Статус</label>
                            <Input
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="bg-neutral-800 border-neutral-700"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-medium">Опис</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-neutral-800 border-neutral-700 h-32"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Скасувати</Button>
                    <Button onClick={handleSubmit} disabled={loading || !name}>
                        {loading ? "Збереження..." : "Зберегти"}
                    </Button>
                </DialogFooter>
            </DialogContent>

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent className="bg-[#020617] border-red-900/50 text-slate-50">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Видалити "{name}"?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            Ця дія незворотна. Запис буде видалено з Бази Знань.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-slate-800 hover:bg-slate-800 hover:text-white">Скасувати</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-900 hover:bg-red-800 text-white border border-red-800"
                            onClick={handleDelete}
                        >
                            Видалити
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
