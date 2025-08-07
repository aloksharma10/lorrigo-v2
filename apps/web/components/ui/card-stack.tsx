'use client';

import { useEffect, useState } from 'react';

let interval: any;

type Card = {
  id: number;
  name: string;
  designation: string;
  content: React.ReactNode;
};

export const CardStack = ({ items, offset, scaleFactor }: { items: Card[]; offset?: number; scaleFactor?: number }) => {
  const CARD_OFFSET = offset || 10;
  const SCALE_FACTOR = scaleFactor || 0.06;
  const [cards, setCards] = useState<Card[]>(items);

  //   useEffect(() => {
  //     startFlipping();

  //     return () => clearInterval(interval);
  //   }, []);

  const startFlipping = () => {
    interval = setInterval(() => {
      setCards((prevCards: Card[]) => {
        const newArray = [...prevCards]; // create a copy of the array
        newArray.unshift(newArray.pop()!); // move the last element to the front
        return newArray;
      });
    }, 5000);
  };

  return (
    <div className="relative mt-10 w-full max-w-xl">
      {cards.map((card, index) => {
        return (
          <div
            key={card.id}
            className="absolute w-full rounded-3xl border border-neutral-200 bg-white p-4 shadow-xl shadow-black/[0.1] dark:border-white/[0.1] dark:bg-black dark:shadow-white/[0.05]"
            style={{
              transformOrigin: 'top center',
              top: index * -CARD_OFFSET,
              transform: `scale(${1 - index * SCALE_FACTOR})`,
              zIndex: cards.length - index,
            }}
          >
            <div className="flex flex-col justify-between">
              <div className="font-normal text-neutral-700 dark:text-neutral-200">{card.content}</div>
              <div>
                <p className="font-medium text-neutral-500 dark:text-white">{card.name}</p>
                <p className="font-normal text-neutral-400 dark:text-neutral-200">{card.designation}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Helper component for step content
export function StepContent({
  children,
  onComplete,
  isCompleted = false,
  className,
}: {
  children: React.ReactNode;
  onComplete?: () => void;
  isCompleted?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-6 ${className || ''}`}>
      {children}
      {onComplete && !isCompleted && (
        <div className="flex justify-center pt-4">
          <button onClick={onComplete} className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
            <span>Complete Step</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
