import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={`relative overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 rounded-full w-9 ${className}`}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: resolvedTheme === 'light' ? 0 : 180,
          scale: 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
          mass: 0.8,
        }}
        className="relative"
      >
        <motion.div
          initial={false}
          animate={{
            opacity: resolvedTheme === 'light' ? 1 : 0,
            y: resolvedTheme === 'light' ? 0 : -10,
          }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sun className="h-4 w-4 " />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            opacity: resolvedTheme === 'dark' ? 1 : 0,
            y: resolvedTheme === 'dark' ? 0 : 10,
          }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Moon className="h-3 w-3 " />
        </motion.div>
      </motion.div>

      {/* Glow effect for dark mode */}
      <motion.div
        initial={false}
        animate={{
          opacity: resolvedTheme === 'dark' ? 0.1 : 0,
          scale: resolvedTheme === 'dark' ? 1.5 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 rounded-md bg-primary/20 blur-sm"
      />

      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
