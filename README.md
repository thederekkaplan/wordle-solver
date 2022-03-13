# Wordle Solver
A command-line tool to solve games of Wordle and Absurdle. 

## The Algorithm
Currently, the program uses a simple greedy algorithm, suggesting the guess that will result in the smallest number of possible answers at the next step.

<details>
    <summary> Why not use a search tree? </summary>
    
A search tree would give us the optimal strategy, but at the cost of time. Search trees are commonly used in chess, where the branching factor is about 35 (i.e., from any given board position there are, on average, about 35 legal moves). However, in Wordle, the game will accept over 12,000 words as guesses. So Wordle has a branching factor over 300 times that of chess. This makes solving Wordle with a search tree intractable without precomputing the entire tree, which, while possible, is not within the spirit of this project.
</details>

## Options
### Wordle and Absurdle mode
In Wordle mode, the algorithm assumes that the target word is chosen randomly from the list of possible answers. In Absurdle mode, the algorithm assumes that the opponent will adversarily give clues that result in the largest number of possible answers.

### Normal and hard mode
In normal mode, all guesses are allowed. In hard mode, only guesses that use all available information are allowed (i.e., they are possible answers given the clues so far).

## Entering guesses and clues
Before each guess, you are given the option to enter your own guess or have the algorithm suggest a guess for you. After one of these happens, you will need to enter the clue that the game gives you. You will see a colored box prompt such as `🟨🟨🟩⬛⬛`. Use the left and right arrow keys to move from one box to another, and use the up and down arrow keys to change the color of a box. Press enter to submit the clue.

## Installation and usage
Install dependencies: `npm install`
Start: `npm run start`