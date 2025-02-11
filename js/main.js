"use strict";

class Part {
    constructor() {
        this.soloParity = false;
        this.basePayment = false;
        this.win = false;
        this.boost = 0;
        this.value = 0;
        this.score = 100;
        this.name = '';
    }
}

class Result {
    constructor() {
        this.ownValue = 0;
        this.enemyValue = 0;
        this.comment = '';
        this.accepted = false;
        this.basePart = new Part();
        this.linkPart = new Part();
        this.betterTrump = false;
        this.errorMessage = '';
    }
}

class BaseValues {
    static minGroupSize = 3;
    static baseCeiling = 15000;
    static game = 10;
    static silentSeven = 10;
    static seven = 20;
    static silentHundred = 20;
    static hundred = 40;
    static betl = 150;
    static majklBetl = 150;
    static majklSuperBetl = 150;
    static durch = 300;
    static twoSevens = 400;
    static minorFault = 100;
    static majorFault = 500;
    static fold = 60;
}

class ParityPayment {
    soloParity = false;
    basePayment = false;
}

class SimpleParser {
    /**
     * 
     * @param {string} playString 
     */
    parse(playString) {
        let result = new Result();
        let play = playString.trim();

        const commentRegex = /\{([^\}]*)\}$/;
        let match = play.match(commentRegex);
        if (match !== null) {
            result.comment = match[1];
            play = play.replace(commentRegex, '')
        }

        if (play === 'e') {
            result.basePart.value = BaseValues.fold;
            result.basePart.name = 'omyl';
            return result;
        }

        if (play === 'r1') {
            result.basePart.value = BaseValues.minorFault;
            result.basePart.name = 'r1';
            return result;
        }

        if (play === 'r2') {
            result.basePart.value = BaseValues.majorFault;
            result.basePart.name = 'r2';
            return result;
        }

        let parityPayment = new ParityPayment();
        let err = new Error();

        [play, parityPayment, err] = this.#extractParityPayment(play);
        if (err !== null) {
            return err;
        }

        result.basePart.soloParity = parityPayment.soloParity;
        result.basePart.basePayment = parityPayment.basePayment;

        match = play.match(/^([+-])/);
        if (match === null) {
            return new Error('chybí plus nebo mínus u základního závazku');
        }

        result.basePart.win = (match[1] === '+');
        play = play.slice(1);

        [play, result.basePart.boost] = this.#extractBoost(play);

        let canHaveBetter = true;
        
        if (play.startsWith('s')) {
            result.basePart.value = BaseValues.seven;
            result.basePart.name = 'sedma';
            play = play.slice(1);
            [play, parityPayment, err] = this.#extractParityPayment(play)
            if (err !== null) {
                return err;
            }

            result.linkPart.soloParity = parityPayment.soloParity;
            result.linkPart.basePayment = parityPayment.basePayment;

            match = play.match(/^([+-])/)
            if (match === null) {
                return new Error('chybí herní závazek u sedmy');
            }
            result.linkPart.win = (match[1] === '+');
            play = play.slice(1);
            [play, result.linkPart.boost] = this.#extractBoost(play)

            if (play.startsWith('h')) {
                result.linkPart.value = BaseValues.game;
                result.linkPart.name = 'hra';
                play = play.slice(1);
            } else if (play.startsWith('t')) {
                result.linkPart.value = BaseValues.silentHundred;
                result.linkPart.name = 'tiché kilo';
                play = play.slice(1);
                [play, result.linkPart.score, err] = this.#extractScore(play)
                if (err !== null) {
                    return err;
                }
            } else {
                return new Error('chybí herní závazek u sedmy');
            }
        } else if (play.startsWith('k')) {
            result.basePart.value = BaseValues.hundred;
            result.basePart.name = 'kilo';
            play = play.slice(1);
            [play, result.basePart.score, err] = this.#extractScore(play);
            if (err !== null) {
                return err;
            }
            [play, parityPayment, err] = this.#extractParityPayment(play);
            if (err !== null) {
                return err;
            }
            result.linkPart.soloParity = parityPayment.soloParity;
            result.linkPart.basePayment = parityPayment.basePayment;

            match = play.match(/^([+-])/);
            if (match !== null) {
                result.linkPart.win = (match[1].value === '+');
                play = play.slice(1);
                if (play.startsWith('n')) {
                    result.linkPart.value = BaseValues.silentSeven;
                    result.linkPart.name = 'tichá sedma';
                    play = play.slice(1);
                } else {
                    [play, result.linkPart.boost] = this.#extractBoost(play)
                    if (!play.startsWith('s')) {
                        return new Error('neznámý herní závazek po kilu');
                    }
                    result.linkPart.value = BaseValues.seven;
                    result.linkPart.name = 'sedma';
                    play = play.slice(1);
                }
            }
        } else if (play.startsWith('c')) {
            result.basePart.value = BaseValues.betl;
            result.basePart.name = 'cedník';
            play = play.slice(1);
            canHaveBetter = false;
        } else if (play.startsWith('d')) {
            result.basePart.value = BaseValues.durch;
            result.basePart.name = 'durch';
            play = play.slice(1);
            canHaveBetter = false;
        } else if (play.startsWith('mc')) {
            result.basePart.value = BaseValues.majklBetl;
            result.basePart.name = 'majklův cedník';
            play = play.slice(2);
            canHaveBetter = false;
        } else if (play.startsWith('msc')) {
            result.basePart.value = BaseValues.majklSuperBetl;
            result.basePart.name = 'majklův super cedník';
            play = play.slice(3);
            canHaveBetter = false;
        } else if (play.startsWith('v')) {
            result.basePart.value = BaseValues.twoSevens;
            result.basePart.name = 'dvě sedmy';
            play = play.slice(1);
            [play, parityPayment, err] = this.#extractParityPayment(play)
            if (err !== null) {
                return err;
            }
            result.linkPart.soloParity = parityPayment.soloParity;
            result.linkPart.basePayment = parityPayment.basePayment;
            match = play.match(/^([+-])/);
            if (match !== null) {
                result.linkPart.win = (match[1] === '+');
                play = play.slice(1);
                [play, result.linkPart.boost] = this.#extractBoost(play)
                if (!play.startsWith('k')) {
                    return new Error('očekáván závazek kilo po dvou sedmách');
                }
                result.linkPart.value = BaseValues.hundred;
                result.linkPart.name = 'kilo';
                play = play.slice(1);
                [play, result.linkPart.score, err] = this.#extractScore(play);
                if (err !== null) {
                    return err;
                }
            }
        } else {
            return new Error('neznámý základní závazek');
        }

        if (play.startsWith('*')) {
            if (!canHaveBetter) {
                return new Error('závazek není kompatibilní s lepší barvou');
            }
            result.betterTrump = true;
            play = play.slice(1);
        }

        if (play.length > 0) {
            return new Error('nadbytečné znaky na konci specifikace');
        }

        if (result.basePart.value === 0) {
            return new Error('chybí základní závazek');
        }

        if (result.linkPart.soloParity && result.linkPart.value === 0) {
            return new Error('neúplně specifikovaný doplňkový závazek');
        }
        
        return result;
    }

    /**
     * 
     * @param {string} play 
     * @returns {[string, number, Error]} [play, score, error]
     */
    #extractScore(play) {
        let score = 1;
        if (play.startsWith('-')) {
            score = -1;
            play = play.slice(1);
        }
        const scoreRegex = /^(\d+)/;
        const match = play.match(scoreRegex);
        if (match === null) {
            return [null, null, new Error('chybí skóre u kila')];
        }
        score *= parseInt(match[1]);
        if (score < -100 || score > 190) {
            return [null, null, new Error('skóre u kila mimo rozsah [-100;190]')];
        }
        if (score % 10 !== 0) {
            return [null, null, new Error('skóre u kila není dělitelné 10')];
        }
        play = play.replace(scoreRegex, '');
        return [play, score, null];
    }

    /**
     * 
     * @param {string} play 
     * @return {[string, number]} [play, boost]
     */
    #extractBoost(play) {
        const match = play.match(/^([1234])/);
        if (match === null) {
            return [play, 0];
        }
        play = play.slice(1);
        const boost = parseInt(match[1]);
        return [play, boost];
    }

    /**
     * 
     * @param {string} play 
     * @returns {[string, ParityPayment, Error]} [play, parityPayment, error]
     */
    #extractParityPayment(play) {
        const parityPayment = new ParityPayment();
        if (play.startsWith('$')) {
            parityPayment.soloParity = true;
            play = play.slice(1);
        }
        if (play.startsWith(':')) {
            if (!parityPayment.soloParity) {
                return [null, null, new Error('základní platba bez sólo platby')];
            }
            parityPayment.basePayment = true;
            play = play.slice(1);
        }
        return [play, parityPayment, null];
    }
}

class HundredType {
    static get multiplicative() { return 'násobené'; }
    static get additive() { return 'sčítané'; }
}

class IndexOption {
    hundredType = HundredType.multiplicative;
    multiplier = 1;
}

class SimpleEvaluator {
    groupSize = BaseValues.minGroupSize;
    indexOpt = new IndexOption();

    /**
     * 
     * @param {number} groupSize 
     * @param {IndexOption} indexOpt 
     */
    constructor(groupSize = 3, indexOpt = new IndexOption()) {
        if (groupSize < BaseValues.minGroupSize) {
            return new Error('velikost skupiny je menší než ' + BaseValues.minGroupSize);
        }
        this.groupSize = groupSize;
        this.indexOpt = indexOpt;
        this.enemyPlayers = groupSize - 1;
        this.downrightBasePayingPlayers = groupSize - 2;
    }

    /**
     * 
     * @param {string} playString 
     */
    evaluate(playString) {
        const parser = new SimpleParser();
        const result = parser.parse(playString);

        if (result instanceof Error) {
            return this.#errorToResult(result);
        }

        for (const ownPov of [true, false]) {
            const baseValue = this.#evaluatePart(result.basePart, ownPov, result.betterTrump);
            if (baseValue instanceof Error) {
                return this.#errorToResult(baseValue);
            }

            const linkValue = this.#evaluatePart(result.linkPart, ownPov, result.betterTrump);
            if (linkValue instanceof Error) {
                return this.#errorToResult(linkValue);
            }

            const totalValue = this.#trimByCeiling(ownPov, baseValue + linkValue);

            if (ownPov) {
                result.ownValue = totalValue;
            } else {
                result.enemyValue = totalValue;
            }
        }
        
        result.accepted = true;
        return result;
    }

    /**
     * 
     * @param {Error} err 
     */
    #errorToResult(err) {
        const result = new Result();
        result.accepted = false;
        result.errorMessage = err.message;
        return result;
    }

    /**
     * 
     * @param {boolean} ownPov 
     * @param {number} value 
     */
    #trimByCeiling(ownPov, value) {
        let actualCeiling = BaseValues.baseCeiling;
        if (ownPov) {
            actualCeiling *= this.enemyPlayers;
        }

        actualCeiling *= this.indexOpt.multiplier;

        if (value < -actualCeiling) {
            return -actualCeiling;
        }

        if (value > actualCeiling) {
            return actualCeiling;
        }

        return value;
    }

    /**
     * 
     * @param {Part} part 
     * @param {boolean} ownPov 
     * @param {boolean} betterTrump 
     */
    #evaluatePart(part, ownPov, betterTrump) {
        let value = part.value;

        value = this.#evaluateScore(value, part.score);
        if (value instanceof Error) {
            return value;
        }

        value *= this.#evaluateBoost(ownPov, part.soloParity, part.basePayment, part.win, part.boost);
        value *= this.#evaluateTrump(betterTrump);
        value *= this.indexOpt.multiplier;

        return value;
    }

    /**
     * 
     * @param {boolean} betterTrump 
     */
    #evaluateTrump(betterTrump) {
        return betterTrump ? 2 : 1;
    }

    /**
     * 
     * @param {boolean} ownPov 
     * @param {boolean} soloParity 
     * @param {boolean} basePayment 
     * @param {boolean} win 
     * @param {number} boost 
     */
    #evaluateBoost(ownPov, soloParity, basePayment, win, boost) {
        let value = Math.pow(2, boost);

        if (!ownPov) {
            if (soloParity) {
                return 0;
            }
            value *= -1;
        }

        if (basePayment) {
            value = value * this.enemyPlayers - this.downrightBasePayingPlayers;
        } else if (ownPov) {
            value *= this.enemyPlayers;
        }

        if (!win) {
            value *= -1;
        }

        return value;
    }

    /**
     * 
     * @param {number} value 
     * @param {number} score 
     */
    #evaluateScore(value, score) {
        const factor = (score < 100 ? 100 - score : score - 90) / 10;
        
        switch (this.indexOpt.hundredType) {
            case HundredType.multiplicative:
                return value * Math.pow(2, factor - 1);

            case HundredType.additive:
                return value * factor;

            default:
                return new Error('nepodporovaný typ kila: ' + this.indexOpt.hundredType);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // let parser = new SimpleParser();
    // const result = parser.parse('$:+k130-3s');
    const opt = new IndexOption();
    opt.hundredType = HundredType.additive;
    const evaluator = new SimpleEvaluator(3, opt);
    const result = evaluator.evaluate('+k130-3s*');

    if (!result.accepted) {
        document.getElementById('error').textContent = 'Chyba: ' + result.errorMessage;
    } else {
        document.getElementById('ownValue').textContent = 'Vlastní hodnota: ' + result.ownValue.toString();
        document.getElementById('enemyValue').textContent = 'Cizí hodnota: ' + result.enemyValue.toString();
    }


}, false);

function downloadIndex() {
    //const data = 'Hello, world!';
    const data = localStorage.getItem('test-key');
    const blob = new Blob([data], { type: 'text/plain' });
    const fileURL = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = fileURL;
    downloadLink.download = 'example.txt';
    document.body.appendChild(downloadLink);
    downloadLink.click();
}
