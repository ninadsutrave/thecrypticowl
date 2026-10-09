export interface TriviaQuestion {
  category: string;
  question: string;
  options: [string, string, string, string];
  /** Index into `options`. */
  answer: number;
  /** Shown after answering: why the answer is right. */
  fact: string;
  /** Where the fact comes from (generated questions always have one). */
  source?: { label: string; url: string };
}

/**
 * Placeholder set until the daily generator ships: ten medium questions,
 * about 30 seconds each. Every answer checked against Wikipedia.
 */
export const SAMPLE_TRIVIA: TriviaQuestion[] = [
  {
    category: 'Geography',
    question: 'Which is the only country whose national flag is neither a rectangle nor a square?',
    options: ['Bhutan', 'Switzerland', 'Nepal', 'Qatar'],
    answer: 2,
    fact: "Nepal's flag is two stacked pennants. Switzerland's is square; the others are rectangles.",
  },
  {
    category: 'Science',
    question: 'Which element has the chemical symbol W?',
    options: ['Tungsten', 'Tin', 'Titanium', 'Zinc'],
    answer: 0,
    fact: "W comes from 'wolfram', tungsten's other name, which is still used in many languages.",
  },
  {
    category: 'History',
    question:
      'Which empire was ruled from Constantinople until the city fell to the Ottomans in 1453?',
    options: ['Holy Roman Empire', 'Byzantine Empire', 'Persian Empire', 'Mongol Empire'],
    answer: 1,
    fact: 'The Byzantine Empire was the continuation of the Eastern Roman Empire, centred on Constantinople.',
  },
  {
    category: 'Art',
    question: "Who painted 'The Persistence of Memory', the one with the melting clocks?",
    options: ['René Magritte', 'Pablo Picasso', 'Joan Miró', 'Salvador Dalí'],
    answer: 3,
    fact: 'Salvador Dalí painted it in 1931. It hangs in the Museum of Modern Art in New York.',
  },
  {
    category: 'Music',
    question: "Which band released the album 'The Dark Side of the Moon' in 1973?",
    options: ['Pink Floyd', 'Led Zeppelin', 'Genesis', 'The Who'],
    answer: 0,
    fact: 'Pink Floyd’s eighth album spent more than 900 weeks on the US Billboard 200 chart.',
  },
  {
    category: 'Geography',
    question: 'What is the capital city of Australia?',
    options: ['Sydney', 'Canberra', 'Melbourne', 'Perth'],
    answer: 1,
    fact: 'Canberra was purpose-built as a compromise between rivals Sydney and Melbourne.',
  },
  {
    category: 'Nature',
    question: 'How many hearts does an octopus have?',
    options: ['One', 'Two', 'Three', 'Eight'],
    answer: 2,
    fact: 'Two hearts pump blood through the gills and a third pumps it round the rest of the body.',
  },
  {
    category: 'Literature',
    question: "Who wrote the novel 'One Hundred Years of Solitude'?",
    options: [
      'Jorge Luis Borges',
      'Isabel Allende',
      'Gabriel García Márquez',
      'Mario Vargas Llosa',
    ],
    answer: 2,
    fact: 'The Colombian author published it in 1967 and won the Nobel Prize in Literature in 1982.',
  },
  {
    category: 'Sport',
    question: "The 'Fosbury Flop' is a technique used in which athletics event?",
    options: ['Pole vault', 'Long jump', 'Triple jump', 'High jump'],
    answer: 3,
    fact: 'Dick Fosbury won Olympic gold with it in 1968 by going over the bar backwards, head first.',
  },
  {
    category: 'Geography',
    question: 'Counting cold deserts too, which is the largest desert on Earth?',
    options: ['Sahara', 'Antarctica', 'Arabian', 'Gobi'],
    answer: 1,
    fact: 'A desert is defined by low precipitation, not heat. Antarctica gets very little and is about 14 million km².',
  },
];
