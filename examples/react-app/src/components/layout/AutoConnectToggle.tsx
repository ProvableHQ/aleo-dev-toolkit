import { useAtom } from 'jotai';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { autoConnectAtom } from '@/lib/store/global';

export function AutoConnectToggle() {
  const [autoConnect, setAutoConnect] = useAtom(autoConnectAtom);

  return (
    <div className="flex items-center gap-2 px-2">
      <Switch
        id="auto-connect"
        checked={autoConnect}
        onCheckedChange={setAutoConnect}
        className="scale-90"
      />
      <Label htmlFor="auto-connect" className="label-xs text-muted-foreground cursor-pointer">
        Auto Connect
      </Label>
    </div>
  );
}
