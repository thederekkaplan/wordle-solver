# Wordle Solver
A command-line tool to solve games of Wordle and Absurdle. 

## The Algorithm
Currently, the program uses a simple greedy algorithm, suggesting the guess that will result in the smallest number of possible answers at the next step.

## Options
### Wordle and Absurdle mode
In Wordle mode, the algorithm assumes that the target word is chosen randomly from the list of possible answers. In Absurdle mode, the algorithm assumes that the opponent will adversarily give clues that result in the largest number of possible answers.

### Normal and hard mode
In normal mode, all guesses are allowed. In hard mode, only guesses that use all available information are allowed (i.e., they are possible answers given the clues so far).

## Entering guesses and clues
Before each guess, you are given the option to enter your own guess or have the algorithm suggest a guess for you. After one of these happens, you will need to enter the clue that the game gives you. You will see a colored box prompt like `🟨🟨🟩⬛⬛`. Use the left and right arrow keys to move from one box to another, and use the up and down arrow keys to change the color of a box. Press enter to submit the clue.

## Installation and usage
Install dependencies: `npm install`
Start: `npm run start`