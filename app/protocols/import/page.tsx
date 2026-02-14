'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Loader2, CheckCircle2, AlertCircle, Upload, Sparkles, Edit } from 'lucide-react';
import Link from 'next/link';
import { extractTextFromPDF, extractProtocolFromText } from '@/lib/pdfExtractor';
import { useProtocolStore } from '@/lib/store/protocolStore';
import { Movement, ProtocolSettings } from '@/lib/types';
import MovementEditor from '@/components/MovementEditor';
import { nanoid } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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

type ImportStep = 'upload' | 'extracting' | 'review' | 'saving';

const DEFAULT_SETTINGS: ProtocolSettings = {
  rest_between_reps_ms: 2000,
  countdown_before_start_ms: 3000,
  audio_cues: true,
};

export default function ImportProtocolPage() {
  const router = useRouter();
  const { addProtocol } = useProtocolStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [extracted, setExtracted] = useState<{
    name: string;
    description: string;
    movements: Movement[];
  } | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [movements, setMovements] = useState<Movement[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    setError(null);
    setStep('extracting');
    try {
      const text = await extractTextFromPDF(file);
      const result = await extractProtocolFromText(text, file.name);
      setExtracted(result);
      setName(result.name);
      setDescription(result.description);
      setMovements(result.movements);
      setStep('review');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to extract protocol from PDF.';
      setError(msg);
      setStep('upload');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

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

  const updateMovement = (id: string, updates: Partial<Movement>) => {
    setMovements((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const deleteMovement = (id: string) => {
    setMovements((prev) => prev.filter((m) => m.id !== id));
  };

  const addMovement = () => {
    setMovements((prev) => [
      ...prev,
      {
        id: nanoid(),
        name: '',
        muscle_group: '',
        type: 'contraction',
        duration_ms: 5000,
        repetitions: 3,
        instructions: '',
      },
    ]);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Protocol name is required.');
      return;
    }
    setStep('saving');
    const protocol = addProtocol({
      name: name.trim(),
      description: description.trim(),
      movements,
      settings: DEFAULT_SETTINGS,
    });
    router.push(`/protocols/${protocol.id}`);
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
          <h1 className="text-xl font-bold">Import Protocol from PDF</h1>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI-Assisted
          </Badge>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Protocol PDF
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
                  ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/20'}
                `}
              >
                <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="font-medium text-muted-foreground">
                  Drop a PDF here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  The AI will extract movements, durations, and muscle groups
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  How AI extraction works
                </p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>PDF text is extracted client-side</li>
                  <li>Text is analyzed to identify movements, durations, and muscle groups</li>
                  <li>A structured protocol is generated for your review</li>
                  <li>You can edit any details before saving</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'extracting' && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-medium">Analyzing PDF...</p>
                <p className="text-sm text-muted-foreground">Reading text → sending to AI → parsing protocol</p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'review' && extracted && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Protocol extracted successfully. Review and edit before saving.
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Protocol Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Protocol Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none h-20"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Movements ({movements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={movements.map((m) => m.id)} strategy={verticalListSortingStrategy}>
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
                <Button variant="outline" onClick={addMovement} className="w-full gap-2 border-dashed mt-2">
                  + Add Movement
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Re-upload
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Save Protocol
              </Button>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <Card>
            <CardContent className="py-16">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-medium">Saving protocol...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
