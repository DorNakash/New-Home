import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const ROOM_EMOJIS = [
  "🛋️", "🍽️", "🛏️", "👶", "💻", "🚿", "🚪", "🧺",
  "🪑", "🚗", "🌿", "🏡", "🧸", "📚", "🎮", "🍳",
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className="w-16 text-lg" />
        }
      >
        {value || "🙂"}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2">
        <div className="grid grid-cols-8 gap-1">
          {ROOM_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
