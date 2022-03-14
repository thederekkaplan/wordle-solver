const fs = require('fs/promises');
const keypress = require('keypress');

enum Status {
    Gray,
    Yellow,
    Green
}

type Clue = Status[];

(async () => {
    let answers = (await fs.readFile("answers.txt", "utf8")).split("\n"); // possible answers
    let guesses = (await fs.readFile("guesses.txt", "utf8")).split("\n");

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
    answers = prune(answers, guess, clue);
    if (hardMode) guesses = prune(guesses, guess, clue);

    while (answers.length > 1) {
        console.log(answers.length, "words remaining");
        ownGuess = await binaryPrompt("1: Use own guess\n2: Suggest guess");
        let guess = "";
        if (ownGuess) {
            do {
                guess = await inputGuess();
            } while (!guesses.includes(guess));
        } else guess = (wordleMode ? wordle(guesses, answers) : absurdle(guesses, answers));

        console.log(guess.split("").join(" "));
        let clue = await inputClue();
        answers = prune(answers, guess, clue);
        if (hardMode) guesses = prune(guesses, guess, clue);
    }
    console.log("The answer is", answers[0]);
    process.exit();

})()

function wordle(guesses: string[], answers: string[]): string {
    if (answers.length === 1) return answers[0];

    let { minGuess } = guesses.reduce(({ minGuess, min }, guess) => {
        let clues: string[][] = Array(243).fill(0).map(v => []);

        for (let answer of answers) {
            let int = clueToInt(getClue(guess, answer));
            clues[int].push(answer);
        }

        let average = clues.map(arr => arr.length * arr.length / answers.length).reduce((acc, cur) => acc + cur, 0);

        if (average < min) return { minGuess: guess, min: average };
        else return { minGuess, min };
    }, { minGuess: "", min: answers.length });

    return minGuess
}

function absurdle(guesses: string[], answers: string[]): string {
    if (answers.length === 1) return answers[0];

    let { minGuess } = guesses.reduce(({ minGuess, min }, guess) => {
        let clues: string[][] = Array(243).fill(0).map(v => []);

        for (let answer of answers) {
            let int = clueToInt(getClue(guess, answer));
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

function getClue(guess: string, answer: string): Clue {
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

function prune(list: string[], guess: string, clue: Clue): string[] {
    return list.filter(v => getClue(guess, v).every((v, i) => v === clue[i]));
}