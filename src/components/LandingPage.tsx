import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';

interface LandingPageProps {
  onEnter: () => void;
}

const Crow = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 200 200"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M123.5,62.1c-2.4-1.2-4.9-1.8-7.5-1.8c-7.9,0-15,6.3-16.1,14.2c-1.3,9.5,4.6,18.1,13.2,19.5c0.8,0.1,1.5,0.2,2.3,0.2c6.9,0,13.1-4.7,15.2-11.5C132.8,75.1,129.8,66.4,123.5,62.1z M52.9,138.1c-1.9,0-3.8-0.5-5.5-1.5c-5.5-3.2-8.4-9.6-6.5-15.6l16.3-51.2c1.9-6,7.8-9.9,13.8-8.6c6,1.3,9.9,7.1,8.6,13.2l-16.3,51.2C62.1,133.5,57.7,138.1,52.9,138.1z M145.2,120.3c-2.9,0-5.7-1.1-7.8-3.3c-4.2-4.2-4.2-11,0-15.2c4.2-4.2,11-4.2,15.2,0c4.2,4.2,4.2,11,0,15.2C150.9,119.2,148.1,120.3,145.2,120.3z" />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const title = "Sen";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  const letterVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.6, 0.01, 0.05, 0.95],
      },
    },
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden p-4">
      {/* Background elements */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-background via-accent to-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      />
      <motion.div
        className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-secondary/10 rounded-full blur-3xl animate-float"
      />
      <motion.div
        className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/10 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '-3s' }}
      />
      
      {/* Flying Crows */}
      <Crow className="absolute top-[10%] -left-[10%] w-24 h-24 text-foreground/10 animate-fly-across" style={{ animationDelay: '-2s', animationDuration: '25s' }} />
      <Crow className="absolute top-[50%] -left-[10%] w-16 h-16 text-foreground/5 animate-fly-across" style={{ animationDelay: '0s', animationDuration: '18s' }} />
      <Crow className="absolute top-[80%] -left-[10%] w-32 h-32 text-foreground/10 animate-fly-across" style={{ animationDelay: '-10s', animationDuration: '30s' }} />


      <motion.div
        className="text-center z-10 flex flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="font-heading text-8xl md:text-9xl font-bold text-foreground flex overflow-hidden"
          aria-label={title}
        >
          {title.split("").map((letter, index) => (
            <motion.span
              key={index}
              variants={letterVariants}
              className="inline-block"
            >
              {letter}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          className="mt-2 text-lg text-muted-foreground"
          variants={itemVariants}
        >
          A game of dreams and crows.
        </motion.p>

        <motion.div variants={itemVariants} className="mt-12">
          <Button
            onClick={onEnter}
            size="lg"
            className="font-semibold text-base shadow-soft-lg"
          >
            Enter the Dream
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};
