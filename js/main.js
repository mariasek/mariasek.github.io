"use strict"

import { Tests } from './evaluator-tests.js'
import { BaseValues, IndexOption, Result, Hundred, ParityPayment, Index } from './types.js'

document.addEventListener('DOMContentLoaded', function() {
    const tests = new Tests()
    tests.runTests()

    setupElements()

    if (localStorage.getItem('evaluatePlay') === undefined) {
        clearEvaluatePlay()
    } else {
        loadEvaluatePlay()
    }

    onChangeEvaluatePlay()

}, false)

class SimpleParser {
    /**
     * 
     * @param {string} playString 
     */
    parse(playString) {
        let result = new Result()
        let play = playString.trim()

        const commentRegex = /\{([^\}]*)\}$/
        let match = play.match(commentRegex)
        if (match !== null) {
            result.comment = match[1]
            play = play.replace(commentRegex, '')
        }

        if (play === 'e') {
            result.basePart.value = BaseValues.fold
            result.basePart.name = 'omyl'
            return result
        }

        if (play === 'r1') {
            result.basePart.value = BaseValues.minorFault
            result.basePart.name = 'r1'
            return result
        }

        if (play === 'r2') {
            result.basePart.value = BaseValues.majorFault
            result.basePart.name = 'r2'
            return result
        }

        let parityPayment = new ParityPayment()
        let err = new Error()

        ;[play, parityPayment, err] = this.#extractParityPayment(play)
        if (err !== null) {
            return err
        }

        result.basePart.soloParity = parityPayment.soloParity
        result.basePart.basePayment = parityPayment.basePayment

        match = play.match(/^([+-])/)
        if (match === null) {
            return new Error('chybí plus nebo mínus u základního závazku')
        }

        result.basePart.win = (match[1] === '+')
        play = play.slice(1)

        ;[play, result.basePart.boost] = this.#extractBoost(play)

        let canHaveBetter = true
        
        if (play.startsWith('s')) {
            result.basePart.value = BaseValues.seven
            result.basePart.name = 'sedma'
            play = play.slice(1)
            ;[play, parityPayment, err] = this.#extractParityPayment(play)
            if (err !== null) {
                return err
            }

            result.linkPart.soloParity = parityPayment.soloParity
            result.linkPart.basePayment = parityPayment.basePayment

            match = play.match(/^([+-])/)
            if (match === null) {
                return new Error('chybí herní závazek u sedmy')
            }
            result.linkPart.win = (match[1] === '+')
            play = play.slice(1)
            ;[play, result.linkPart.boost] = this.#extractBoost(play)

            if (play.startsWith('h')) {
                result.linkPart.value = BaseValues.game
                result.linkPart.name = 'hra'
                play = play.slice(1)
            } else if (play.startsWith('t')) {
                result.linkPart.value = BaseValues.silentHundred
                result.linkPart.name = 'tiché kilo'
                play = play.slice(1)
                ;[play, result.linkPart.score, err] = this.#extractScore(play)
                if (err !== null) {
                    return err
                }
            } else {
                return new Error('chybí herní závazek u sedmy')
            }
        } else if (play.startsWith('k')) {
            result.basePart.value = BaseValues.hundred
            result.basePart.name = 'kilo'
            play = play.slice(1)
            ;[play, result.basePart.score, err] = this.#extractScore(play)
            if (err !== null) {
                return err
            }
            ;[play, parityPayment, err] = this.#extractParityPayment(play)
            if (err !== null) {
                return err
            }
            result.linkPart.soloParity = parityPayment.soloParity
            result.linkPart.basePayment = parityPayment.basePayment

            match = play.match(/^([+-])/)
            if (match !== null) {
                result.linkPart.win = (match[1] === '+')
                play = play.slice(1)
                if (play.startsWith('n')) {
                    result.linkPart.value = BaseValues.silentSeven
                    result.linkPart.name = 'tichá sedma'
                    play = play.slice(1)
                } else {
                    ;[play, result.linkPart.boost] = this.#extractBoost(play)
                    if (!play.startsWith('s')) {
                        return new Error('neznámý herní závazek po kilu')
                    }
                    result.linkPart.value = BaseValues.seven
                    result.linkPart.name = 'sedma'
                    play = play.slice(1)
                }
            }
        } else if (play.startsWith('c')) {
            result.basePart.value = BaseValues.betl
            result.basePart.name = 'cedník'
            play = play.slice(1)
            canHaveBetter = false
        } else if (play.startsWith('d')) {
            result.basePart.value = BaseValues.durch
            result.basePart.name = 'durch'
            play = play.slice(1)
            canHaveBetter = false
        } else if (play.startsWith('mc')) {
            result.basePart.value = BaseValues.majklBetl
            result.basePart.name = 'majklův cedník'
            play = play.slice(2)
            canHaveBetter = false
        } else if (play.startsWith('msc')) {
            result.basePart.value = BaseValues.majklSuperBetl
            result.basePart.name = 'majklův super cedník'
            play = play.slice(3)
            canHaveBetter = false
        } else if (play.startsWith('v')) {
            result.basePart.value = BaseValues.twoSevens
            result.basePart.name = 'dvě sedmy'
            play = play.slice(1)
            ;[play, parityPayment, err] = this.#extractParityPayment(play)
            if (err !== null) {
                return err
            }
            result.linkPart.soloParity = parityPayment.soloParity
            result.linkPart.basePayment = parityPayment.basePayment
            match = play.match(/^([+-])/)
            if (match !== null) {
                result.linkPart.win = (match[1] === '+')
                play = play.slice(1)
                ;[play, result.linkPart.boost] = this.#extractBoost(play)
                if (!play.startsWith('k')) {
                    return new Error('očekáván závazek kilo po dvou sedmách')
                }
                result.linkPart.value = BaseValues.hundred
                result.linkPart.name = 'kilo'
                play = play.slice(1)
                ;[play, result.linkPart.score, err] = this.#extractScore(play)
                if (err !== null) {
                    return err
                }
            }
        } else {
            return new Error('neznámý základní závazek')
        }

        if (play.startsWith('*')) {
            if (!canHaveBetter) {
                return new Error('závazek není kompatibilní s lepší barvou')
            }
            result.betterTrump = true
            play = play.slice(1)
        }

        if (play.length > 0) {
            return new Error('nadbytečné znaky na konci specifikace')
        }

        if (result.basePart.value === 0) {
            return new Error('chybí základní závazek')
        }

        if (result.linkPart.soloParity && result.linkPart.value === 0) {
            return new Error('neúplně specifikovaný doplňkový závazek')
        }
        
        return result
    }

    /**
     * 
     * @param {string} play 
     * @returns {[string, number, Error]} [play, score, error]
     */
    #extractScore(play) {
        let score = 1
        if (play.startsWith('-')) {
            score = -1
            play = play.slice(1)
        }
        const scoreRegex = /^(\d+)/
        const match = play.match(scoreRegex)
        if (match === null) {
            return [null, null, new Error('chybí skóre u kila')]
        }
        score *= parseInt(match[1])
        if (score < -100 || score > 190) {
            return [null, null, new Error('skóre u kila mimo rozsah [-100;190]')]
        }
        if (score % 10 !== 0) {
            return [null, null, new Error('skóre u kila není dělitelné 10')]
        }
        play = play.replace(scoreRegex, '')
        return [play, score, null]
    }

    /**
     * 
     * @param {string} play 
     * @return {[string, number]} [play, boost]
     */
    #extractBoost(play) {
        const match = play.match(/^([1234])/)
        if (match === null) {
            return [play, 0]
        }
        play = play.slice(1)
        const boost = parseInt(match[1])
        return [play, boost]
    }

    /**
     * 
     * @param {string} play 
     * @returns {[string, ParityPayment, Error]} [play, parityPayment, error]
     */
    #extractParityPayment(play) {
        const parityPayment = new ParityPayment()
        if (play.startsWith('$')) {
            parityPayment.soloParity = true
            play = play.slice(1)
        }
        if (play.startsWith(':')) {
            if (!parityPayment.soloParity) {
                return [null, null, new Error('základní platba bez sólo platby')]
            }
            parityPayment.basePayment = true
            play = play.slice(1)
        }
        return [play, parityPayment, null]
    }
}

export class SimpleEvaluator {
    groupSize = BaseValues.minGroupSize
    indexOpt = new IndexOption()

    /**
     * 
     * @param {number} groupSize 
     * @param {IndexOption} indexOpt 
     */
    constructor(groupSize = 3, indexOpt = new IndexOption()) {
        if (groupSize < BaseValues.minGroupSize) {
            return new Error('velikost skupiny je menší než ' + BaseValues.minGroupSize)
        }
        this.groupSize = groupSize
        this.indexOpt = indexOpt
        this.enemyPlayers = groupSize - 1
        this.downrightBasePayingPlayers = groupSize - 2
    }

    /**
     * 
     * @param {string} playString 
     */
    evaluate(playString) {
        const parser = new SimpleParser()
        const result = parser.parse(playString)

        if (result instanceof Error) {
            return this.#errorToResult(result)
        }

        for (const ownPov of [true, false]) {
            const baseValue = this.#evaluatePart(result.basePart, ownPov, result.betterTrump)
            if (baseValue instanceof Error) {
                return this.#errorToResult(baseValue)
            }

            const linkValue = this.#evaluatePart(result.linkPart, ownPov, result.betterTrump)
            if (linkValue instanceof Error) {
                return this.#errorToResult(linkValue)
            }

            const totalValue = this.#trimByCeiling(ownPov, baseValue + linkValue)

            if (ownPov) {
                result.ownValue = totalValue
            } else {
                result.enemyValue = totalValue
            }
        }
        
        result.accepted = true
        return result
    }

    /**
     * 
     * @param {Error} err 
     */
    #errorToResult(err) {
        const result = new Result()
        result.accepted = false
        result.errorMessage = err.message
        return result
    }

    /**
     * 
     * @param {boolean} ownPov 
     * @param {number} value 
     */
    #trimByCeiling(ownPov, value) {
        let actualCeiling = BaseValues.baseCeiling
        if (ownPov) {
            actualCeiling *= this.enemyPlayers
        }

        actualCeiling *= this.indexOpt.multiplier

        if (value < -actualCeiling) {
            return -actualCeiling
        }

        if (value > actualCeiling) {
            return actualCeiling
        }

        return value
    }

    /**
     * 
     * @param {Part} part 
     * @param {boolean} ownPov 
     * @param {boolean} betterTrump 
     */
    #evaluatePart(part, ownPov, betterTrump) {
        let value = part.value

        value = this.#evaluateScore(value, part.score)
        if (value instanceof Error) {
            return value
        }

        value *= this.#evaluateBoost(ownPov, part.soloParity, part.basePayment, part.win, part.boost)
        value *= this.#evaluateTrump(betterTrump)
        value *= this.indexOpt.multiplier

        return value
    }

    /**
     * 
     * @param {boolean} betterTrump 
     */
    #evaluateTrump(betterTrump) {
        return betterTrump ? 2 : 1
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
        let value = Math.pow(2, boost)

        if (!ownPov) {
            if (soloParity) {
                return 0
            }
            value *= -1
        }

        if (basePayment) {
            value = value * this.enemyPlayers - this.downrightBasePayingPlayers
        } else if (ownPov) {
            value *= this.enemyPlayers
        }

        if (!win) {
            value *= -1
        }

        return value
    }

    /**
     * 
     * @param {number} value 
     * @param {number} score 
     */
    #evaluateScore(value, score) {
        const factor = (score < 100 ? 100 - score : score - 90) / 10
        
        switch (this.indexOpt.hundredType) {
            case Hundred.MULTI:
                return value * Math.pow(2, factor - 1)

            case Hundred.ADD:
                return value * factor

            default:
                return new Error('nepodporovaný typ kila: ' + this.indexOpt.hundredType)
        }
    }
}

function setupElements() {
    document.getElementById('evaluate-play').addEventListener('input', onChangeEvaluatePlay)
    document.getElementById('group-size').addEventListener('change', onChangeEvaluatePlay)
    document.getElementById('hundred-type').addEventListener('change', onChangeEvaluatePlay)
    document.getElementById('multiplier').addEventListener('change', onChangeEvaluatePlay)
    document.getElementById('clear-evaluate-play').addEventListener('click', clearEvaluatePlay)
    document.getElementById('create-new-index').addEventListener('click', createNewIndex)
}

function downloadIndex() {
    const data = localStorage.getItem('test-key')
    const blob = new Blob([data], { type: 'text/plain' })
    const fileURL = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')
    downloadLink.href = fileURL
    downloadLink.download = 'example.txt'
    document.body.appendChild(downloadLink)
    downloadLink.click()
}

/** @param {number} */
function toCurrency(value) {
    return ((value / 100).toFixed(2)).replaceAll('.', ',') + ' Kč'
}

class EvaluatePlay {
    groupSize = 3
    play = ''
    hundredType = 'ADD'
    multiplier = 1
}

function onChangeEvaluatePlay() {
    const ep = new EvaluatePlay()

    ep.groupSize = parseInt(document.getElementById('group-size').value)
    ep.play = document.getElementById('evaluate-play').value
    ep.hundredType = document.getElementById('hundred-type').value
    ep.multiplier = parseInt(document.getElementById('multiplier').value)

    localStorage.setItem('evaluatePlay', JSON.stringify(ep))

    const indexOption = new IndexOption()
    indexOption.hundredType = (ep.hundredType === 'ADD' ? Hundred.ADD : Hundred.MULTI)
    indexOption.multiplier = ep.multiplier

    const evaluator = new SimpleEvaluator(ep.groupSize, indexOption)
    const result = evaluator.evaluate(ep.play)

    if (ep.play.length > 0 && !result.accepted) {
        document.getElementById('error').textContent = 'Chyba: ' + result.errorMessage
        document.getElementById('ownValue').textContent = ''
        document.getElementById('enemyValue').textContent = ''
    } else {
        document.getElementById('error').textContent = ''
        document.getElementById('ownValue').textContent = toCurrency(result.ownValue)
        document.getElementById('enemyValue').textContent = toCurrency(result.enemyValue) + '/os'
    }
}

function clearEvaluatePlay() {
    const ep = new EvaluatePlay()
    localStorage.setItem('evaluatePlay', JSON.stringify(ep))
    loadEvaluatePlay()
    onChangeEvaluatePlay()
}

function loadEvaluatePlay() {
    const ep = new EvaluatePlay()
    Object.assign(ep, JSON.parse(localStorage.getItem('evaluatePlay')))
    document.getElementById('group-size').value = ep.groupSize
    document.getElementById('evaluate-play').value = ep.play
    document.getElementById('hundred-type').value = ep.hundredType
    document.getElementById('multiplier').value = ep.multiplier
}

function createNewIndex() {
    const index = new Index()
    localStorage.setItem('newIndex', JSON.stringify(index))
    
}
