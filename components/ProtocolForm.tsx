'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Protocol, Movement, ProtocolSettings } from '@/lib/types';
import { nanoid } from '@/lib/utils';
import { useProtocolStore } from '@/lib/store/protocolStore';
import Navbar from '@/components/Navbar';
import MovementEditor from '@/components/MovementEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Save, ArrowLeft, Settings2 } from 'lucide-react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

interface ProtocolFormProps {
  initialProtocol?: Protocol;
  mode: 'create' | 'edit';
}

const DEFAULT_SETTINGS: ProtocolSettings = {
  rest_between_reps_ms: 2000,
  countdown_before_start_ms: 3000,
  audio_cues: true,
};

function createDefaultMovement(): Movement {
  return {
    id: nanoid(),
    name: '',
    muscle_group: '',
    type: 'contraction',
    duration_ms: 5000,
    repetitions: 3,
    instructions: '',
  };
}

export default function ProtocolForm({ initialProtocol, mode }: ProtocolFormProps) {
  const router = useRouter();
  const { addProtocol, updateProtocol } = useProtocolStore();

  const [name, setName] = useState(initialProtocol?.name ?? '');
  const [description, setDescription] = useState(initialProtocol?.description ?? '');
  const [movements, setMovements] = useState<Movement[]>(
    initialProtocol?.movements ?? []
  );
  const [settings, setSettings] = useState<ProtocolSettings>(
    initialProtocol?.settings ?? DEFAULT_SETTINGS
  );
  const [showSettings, setShowSettings] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMovements((items) => {
        const oldIndex = items.findIndex((m) => m.id === active.id);
        const newIndex = items.findIndex((m) => m.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addMovement = () => {
    setMovements((prev) => [...prev, createDefaultMovement()]);
  };

  const updateMovement = useCallback((id: string, updates: Partial<Movement>) => {
    setMovements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const deleteMovement = useCallback((id: string) => {
    setMovements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!name.trim()) errs.push('Protocol name is required.');
    if (movements.length === 0) errs.push('Add at least one movement.');
    movements.forEach((m, i) => {
      if (!m.name.trim()) errs.push(`Movement ${i + 1}: name is required.`);
      if (m.duration_ms < 500) errs.push(`Movement ${i + 1}: duration must be at least 0.5s.`);
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (mode === 'create') {
      const protocol = addProtocol({ name: name.trim(), description: description.trim(), movements, settings });
      router.push(`/protocols/${protocol.id}`);
    } else if (initialProtocol) {
      updateProtocol(initialProtocol.id, { name: name.trim(), description: description.trim(), movements, settings });
      router.push(`/protocols/${initialProtocol.id}`);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">
            {mode === 'create' ? 'New Protocol' : `Edit: ${initialProtocol?.name}`}
          </h1>
        </div>

        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-1">
            {errors.map((e, i) => (
              <p key={i}>• {e}</p>
            ))}
          </div>
        )}

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Protocol Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Protocol Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Upper Limb Isometric Protocol"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this protocol..."
                className="resize-none h-20"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Movements ({movements.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {movements.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No movements yet. Add one below.
              </p>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={movements.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {movements.map((movement, index) => (
                    <MovementEditor
                      key={movement.id}
                      movement={movement}
                      index={index}
                      onChange={updateMovement}
                      onDelete={deleteMovement}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <Button
              variant="outline"
              onClick={addMovement}
              className="w-full gap-2 border-dashed mt-2"
            >
              <Plus className="h-4 w-4" />
              Add Movement
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-between w-full"
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Protocol Settings
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {showSettings ? 'Hide' : 'Show'}
              </span>
            </button>
          </CardHeader>
          {showSettings && (
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Countdown Before Start (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.countdown_before_start_ms / 1000}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        countdown_before_start_ms: Math.max(0, Number(e.target.value)) * 1000,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Rest Between Reps (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={settings.rest_between_reps_ms / 1000}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        rest_between_reps_ms: Math.max(0, Number(e.target.value)) * 1000,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="audio-cues"
                  checked={settings.audio_cues}
                  onChange={(e) => setSettings((s) => ({ ...s, audio_cues: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="audio-cues" className="text-sm cursor-pointer">
                  Enable audio cues during execution
                </Label>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex justify-end gap-2">
          <Link href={mode === 'edit' && initialProtocol ? `/protocols/${initialProtocol.id}` : '/'}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            {mode === 'create' ? 'Create Protocol' : 'Save Changes'}
          </Button>
        </div>
      </main>
    </div>
  );
}
