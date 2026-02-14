'use client';

import { Movement, MovementType } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MovementEditorProps {
  movement: Movement;
  index: number;
  onChange: (id: string, updates: Partial<Movement>) => void;
  onDelete: (id: string) => void;
}

const typeColors: Record<MovementType, string> = {
  contraction: 'bg-green-500/10 text-green-400 border-green-500/20',
  rest: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  transition: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export default function MovementEditor({ movement, index, onChange, onDelete }: MovementEditorProps) {
  const [expanded, setExpanded] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: movement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border border-border rounded-lg bg-card transition-shadow',
        isDragging && 'shadow-xl opacity-80 border-primary'
      )}
    >
      <div className="flex items-center gap-2 p-3">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">
          {index + 1}
        </span>

        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">
            {movement.name || <span className="text-muted-foreground italic">Unnamed Movement</span>}
          </span>
          <Badge variant="outline" className={cn('text-xs shrink-0', typeColors[movement.type])}>
            {movement.type}
          </Badge>
          <span className="text-xs text-muted-foreground shrink-0">
            {movement.duration_ms / 1000}s × {movement.repetitions}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 p-0 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(movement.id)}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-3 border-t border-border/50 pt-3">
          <div className="space-y-1">
            <Label className="text-xs">Movement Name</Label>
            <Input
              value={movement.name}
              onChange={(e) => onChange(movement.id, { name: e.target.value })}
              placeholder="e.g. Biceps Curl"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Muscle Group</Label>
            <Input
              value={movement.muscle_group}
              onChange={(e) => onChange(movement.id, { muscle_group: e.target.value })}
              placeholder="e.g. Upper Arm"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select
              value={movement.type}
              onValueChange={(v) => onChange(movement.id, { type: v as MovementType })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contraction">Contraction</SelectItem>
                <SelectItem value="rest">Rest</SelectItem>
                <SelectItem value="transition">Transition</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Duration (s)</Label>
              <Input
                type="number"
                min={1}
                value={movement.duration_ms / 1000}
                onChange={(e) => onChange(movement.id, { duration_ms: Math.max(1, Number(e.target.value)) * 1000 })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reps</Label>
              <Input
                type="number"
                min={1}
                value={movement.repetitions}
                onChange={(e) => onChange(movement.id, { repetitions: Math.max(1, Number(e.target.value)) })}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Instructions (optional)</Label>
            <Textarea
              value={movement.instructions ?? ''}
              onChange={(e) => onChange(movement.id, { instructions: e.target.value })}
              placeholder="Any specific instructions for this movement..."
              className="text-sm resize-none h-16"
            />
          </div>
        </div>
      )}
    </div>
  );
}
