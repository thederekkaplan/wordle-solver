const fs = require('fs/promises');
const keypress = require('keypress');

enum Status {
    Gray,
    Yellow,
    Green
}

type Clue = Status[];

type Letters = { [key: string]: { min: number, max: number } }

type Knowledge = {
    letters: Letters // the minimum and maximum amount of each letter of the alphabet
    possibilities: string[][] // for each position in the word, which letters could exist there
}

(async () => {
    let answers = (await fs.readFile("answers.txt", "utf8")).split("\n"); // possible answers
    let guessesWithoutAnswers = (await fs.readFile("guesses.txt", "utf8")).split("\n");
    let guesses = merge(answers, guessesWithoutAnswers); // valid guesses

    let knowledge: Knowledge = {
        letters: Object.fromEntries("abcdefghijklmnopqrstuvwxyz".split("").map(v => [v, { min: 5, max: 0 }])),
        possibilities: Array(5).fill(0).map(_ => [])
    };

    for (let item of answers) {
        for (let i = 0; i < item.length; i++) {
            if (!knowledge.possibilities[i].includes(item[i])) {
                knowledge.possibilities[i].push(item[i]);
            }
        }

        for (let letter of "abcdefghijklmnopqrstuvwxyz") {
            let count = (item.match(new RegExp(letter, "g")) || []).length;
            if (count < knowledge.letters[letter].min) knowledge.letters[letter].min = count;
            if (count > knowledge.letters[letter].max) knowledge.letters[letter].max = count;
        }
    }

    let wordleMode = await binaryPrompt("1: Wordle\n2: Absurdle");
    let hardMode = await binaryPrompt("1: Hard\n2: Normal");
    let ownGuess = await binaryPrompt("1: Use own guess\n2: Suggest guess");

    // Hardcoded first guess because it would take to long to process otherwise, and this will never change
    let guess = "raise";
    if (ownGuess) {
        do {
            guess = await inputGuess();
        } while (!guesses.includes(guess));
    }

    console.log(guess.split("").join(" "));
    let clue = await inputClue();
    [knowledge, answers] = prune(knowledge, answers, guess, clue);
    if (hardMode) [knowledge, guesses] = prune(knowledge, guesses, guess, clue);

    while (answers.length > 1) {
        console.log(answers.length, "words remaining");
        ownGuess = await binaryPrompt("1: Use own guess\n2: Suggest guess");
        let guess = "";
        if (ownGuess) {
            do {
                guess = await inputGuess();
            } while (!guesses.includes(guess));
        } else guess = (wordleMode ? wordle(knowledge, guesses, answers) : absurdle(knowledge, guesses, answers));

        console.log(guess.split("").join(" "));
        let clue = await inputClue();
        [knowledge, answers] = prune(knowledge, answers, guess, clue);
        if (hardMode) [knowledge, guesses] = prune(knowledge, guesses, guess, clue);
    }
    console.log("The answer is", answers[0]);
    process.exit();

})()

function wordle(knowledge: Knowledge, guesses: string[], answers: string[]): string {
    if (answers.length === 1) return answers[0];

    let { minGuess } = guesses.reduce(({ minGuess, min }, guess) => {
        let clues: string[][] = Array(243).fill(0).map(v => []);

        for (let answer of answers) {
            let int = clueToInt(getClue(knowledge, guess, answer));
            clues[int].push(answer);
        }

        let average = clues.map(arr => arr.length * arr.length / answers.length).reduce((acc, cur) => acc + cur, 0);

        if (average < min) return { minGuess: guess, min: average };
        else return { minGuess, min };
    }, { minGuess: "", min: answers.length });

    return minGuess
}

function absurdle(knowledge: Knowledge, guesses: string[], answers: string[]): string {
    if (answers.length === 1) return answers[0];

    let { minGuess } = guesses.reduce(({ minGuess, min }, guess) => {
        let clues: string[][] = Array(243).fill(0).map(v => []);

        for (let answer of answers) {
            let int = clueToInt(getClue(knowledge, guess, answer));
            clues[int].push(answer);
        }

        let max = clues.map(arr => arr.length).reduce((acc, curr) => Math.max(acc, curr), 0);

        if (max < min) return { minGuess: guess, min: max };
        else return { minGuess, min };
    }, { minGuess: "", min: answers.length });

    return minGuess;
}

function binaryPrompt(prompt: string): Promise<boolean> {
    return new Promise(resolve => {
        console.log(prompt);
        process.stdout.write("> ");

        keypress(process.stdin);

        process.stdin.removeAllListeners("keypress");
        process.stdin.on('keypress', function (ch, key) {
            if (!ch) return;
            if (ch === '1') resolve(true);
            switch (ch) {
                case '1':
                    process.stdin.pause();
                    process.stdout.write("1\n");
                    resolve(true);
                    return;
                case '2':
                    process.stdin.pause();
                    process.stdout.write("2\n");
                    resolve(false);
                    return;
                case '\x03':
                    if (key.ctrl) process.exit();
                    break;
            }
        });

        process.stdin.setRawMode(true);
        process.stdin.resume();
    })
}

function inputGuess(): Promise<string> {
    return new Promise(resolve => {
        keypress(process.stdin);

        let guess = "";
        let pos = 0;
        process.stdout.write("Guess: ");

        process.stdin.removeAllListeners("keypress");
        process.stdin.on('keypress', function (ch, key) {
            if (!key) return;
            if (key.name === "backspace") {
                if (guess.length > 0) {
                    guess = guess.substring(0, guess.length - 1);
                    process.stdout.write("\b \b");
                }
                return;
            } else if (key.name === "return") {
                process.stdin.pause();
                console.log('');
                resolve(guess);
                return;
            } else if (key.name === "c" && key.ctrl) {
                process.exit();
            } else if (ch && /[a-zA-Z]/.test(ch)) {
                guess += ch;
                process.stdout.write(ch.toLowerCase());
            }
        });

        process.stdin.setRawMode(true);
        process.stdin.resume();
    });
}

function inputClue(): Promise<Clue> {
    return new Promise(resolve => {
        keypress(process.stdin);

        let clue = [Status.Gray, Status.Gray, Status.Gray, Status.Gray, Status.Gray];
        let pos = 0;
        process.stdout.write(clue.map(v => v === Status.Gray ? "⬛" : v === Status.Yellow ? "🟨" : v === Status.Green ? "🟩" : "").join("") + `\r\x1b[${pos * 2 + 1}G`);

        process.stdin.removeAllListeners("keypress");
        process.stdin.on('keypress', function (ch, key) {
            if (!key) return;
            switch (key.name) {
                case 'return':
                    process.stdin.pause();
                    console.log('');
                    resolve(clue);
                    return;
                case 'left':
                    if (pos > 0) pos--;
                    break;
                case 'right':
                    if (pos < 4) pos++;
                    break;
                case 'up':
                    clue[pos] = (clue[pos] + 2) % 3
                    break;
                case 'down':
                    clue[pos] = (clue[pos] + 1) % 3
                    break;
                case 'c':
                    if (key.ctrl) process.exit();
                    break;
            }
            process.stdout.write('\r\x1b[K' + clue.map(v => v === Status.Gray ? "⬛" : v === Status.Yellow ? "🟨" : v === Status.Green ? "🟩" : "").join("") + `\x1b[${pos * 2 + 1}G`);
        });

        process.stdin.setRawMode(true);
        process.stdin.resume();
    });
}

function clueToInt(clue: Clue): number {
    return clue.reduce((acc, cur) => acc * 3 + cur, 0);
}

function intToClue(i: number): Clue {
    let clue: Clue = [];
    while (i > 0) {
        clue.push(i % 3);
        i = Math.floor(i / 3);
    }
    while (clue.length < 5) {
        clue.push(0);
    }
    return clue.reverse();
}

function getClue(knowledge: Knowledge, guess: string, answer: string): Clue {
    let clue: Clue = [];
    let letters = Object.fromEntries("abcdefghijklmnopqrstuvwxyz".split("").map(v => [v, 0]));

    for (let letter of answer) {
        letters[letter]++;
    }

    for (let i = 0; i < 5; i++) {
        if (guess[i] === answer[i]) {
            clue.push(Status.Green);
            letters[guess[i]]--;
        } else {
            clue.push(Status.Gray);
        }
    }
    for (let i = 0; i < 5; i++) {
        if (clue[i] === Status.Gray && letters[guess[i]] > 0) {
            clue[i] = Status.Yellow;
            letters[guess[i]]--;
        }
    }
    return clue;
}

function prune(knowledge: Knowledge, list: string[], guess: string, clue: Clue): [Knowledge, string[]] {
    let possibilities = updatePossibilites(knowledge.possibilities, guess, clue);
    if (possibilities.some(arr => arr.length == 0)) return [knowledge, []];
    let letters = updateLetters(knowledge.letters, guess, clue);
    for (let [k, v] of Object.entries(letters)) {
        if (v.min < letters[k].min || v.max > letters[k].max || v.min > v.max) return [knowledge, []];
    }
    let result = [];

    outer: for (let item of list) {
        for (let i = 0; i < 5; i++) {
            if (!possibilities[i].includes(item[i])) continue outer;
        }

        let itemLetters = new Set(item.split(""));

        for (let letter of Object.keys(letters)) {
            let count = (item.match(new RegExp(letter, "g")) || []).length;
            if (count < letters[letter].min || count > letters[letter].max) continue outer;
        }

        result.push(item);
    }

    return [{ possibilities, letters }, result];
}

function updateLetters(letters: Letters, guess: string, clue: Clue): Letters {
    let newLetters = { ...letters };

    let guessLetters = new Set(guess.split(""));
    for (let letter of guessLetters) {
        let [all, yes, no] = guess.split("").reduce(([all, yes, no], char, i) => {
            if (char !== letter) {
                return [all, yes, no]
            }
            if (clue[i] === Status.Gray) {
                return [all + 1, yes, no + 1]
            } else {
                return [all + 1, yes + 1, no]
            }
        }, [0, 0, 0]);

        let min = Math.max(yes, letters[letter].min);
        let max = letters[letter].max;
        if (no > 0) max = yes;
        newLetters[letter] = { min, max };
    }

    return newLetters;
}

function updatePossibilites(possibilities: string[][], guess: string, clue: Clue): string[][] {
    possibilities = possibilities.map(arr => arr.slice());
    for (let i = 0; i < 5; i++) {
        if (clue[i] === Status.Gray) {
            possibilities[i] = possibilities[i].filter(v => v !== guess[i])
        }
        if (clue[i] === Status.Yellow) {
            possibilities[i] = possibilities[i].filter(v => v !== guess[i])
        }
        if (clue[i] === Status.Green) {
            possibilities[i] = possibilities[i].filter(v => v === guess[i])
        }
    }
    return possibilities;
}

function merge(list1: string[], list2: string[]): string[] {
    let i = 0, j = 0;
    let result = [];

    while (i < list1.length && j < list2.length) {
        if (list1[i] <= list2[j]) {
            result.push(list1[i]);
            i++;
        } else {
            result.push(list2[j]);
            j++;
        }
    }
    if (i < list1.length) {
        result.push(...list1.slice(i));
    }
    if (j < list2.length) {
        result.push(...list2.slice(j));
    }

    return result;
}