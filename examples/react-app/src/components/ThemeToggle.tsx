import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <Button
      variant="outline"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={className}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: resolvedTheme === 'light' ? 0 : 180,
          scale: 1,
        }}
        transition={{ type: 'spring', stiffness: 50, mass: 0.5 }}
      >
        <Moon className="transition-colors duration-200 dark:hidden" width={16} height={16} />
        <Sun className="hidden transition-colors duration-200 dark:block" width={16} />
      </motion.div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
