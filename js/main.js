"use strict"

import { Tests } from './evaluator-tests.js'
import { BaseValues, IndexOption, Result, Hundred, ParityPayment, Index, Player, Group, Play } from './types.js'

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
    recalculateIndexBalance()

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

class TextIndexReaderV2 {
    /** 
     * @param {string} text 
     * @returns {[Index, Error]} [index, err]
     * */
    readIndex(text) {
        const TOKEN_DATE = 'date'
        const TOKEN_PLACE = 'place'
        const TOKEN_OPTION = 'option'
        const TOKEN_PLAYER = 'player'
        const TOKEN_NEWLINE = 'newline'
        const TOKEN_PLAY = 'play'
        const TOKEN_COMMENT = 'comment'
        const TOKEN_SEPARATOR = 'separator'

        let isFirstLine = true
        /** @type {string[]} */
        let buffer = []
        let currentToken = TOKEN_DATE
        /** @type {Date} */
        let date
        let place = ''
        /** @type {string[]} */
        let opts = []
        let player = new Player()
        let group = new Group()
        /** @type {Group[]} */
        let groups = []

        for (let idx = 0; idx < text.length; idx++) {
            const c = text[idx]

            if (isFirstLine) {
                if (currentToken === TOKEN_DATE && c === ' ') {
                    date = Date.parse(buffer.join(''))
                    if (date === NaN) {
                        return [null, new Error('nevalidní datum')]
                    }
                    buffer = []
                    currentToken = TOKEN_PLACE
                    continue
                }
                if (currentToken === TOKEN_PLACE && (c === '{' || c === '\n')) {
                    place = buffer.join('').trim()
                    buffer = []
                    if (c === '{') {
                        currentToken = TOKEN_OPTION
                    } else {
                        currentToken = TOKEN_PLAYER
                        isFirstLine = false
                    }
                    continue
                }
                if (currentToken === TOKEN_OPTION && (c === ' ' || c === '}')) {
                    opts.push(buffer.join(''))
                    buffer = []
                    if (c === '}') {
                        currentToken = TOKEN_NEWLINE
                    }
                    continue
                }
                if (currentToken === TOKEN_NEWLINE && c === '\n') {
                    if (buffer.length > 0) {
                        return [null, new Error(`neočekávané znaky '${buffer.join('')}'`)]
                    }
                    currentToken = TOKEN_PLAYER
                    isFirstLine = false
                    continue
                }
            } else {
                if (currentToken === TOKEN_PLAYER && c === ' ') {
                    currentToken = TOKEN_PLAY
                    player.name = buffer.join('')
                    buffer = []
                    continue
                }
                if (currentToken === TOKEN_PLAYER && c === '\n') {
                    if (buffer.length > 0) {
                        player.name = buffer.join('')
                        buffer = []
                        group.players.push(player)
                        player = new Player()
                    } else {
                        groups.push(group)
                        group = new Group()
                    }
                    continue
                }
                if (currentToken === TOKEN_PLAY && c === '{') {
                    currentToken = TOKEN_COMMENT
                } else if (currentToken === TOKEN_PLAY && (c === ' ' || c === '\n')) {
                    const spec = buffer.join('')
                    player.plays.push(new Play(spec, idx - spec.length))
                    buffer = []
                    if (c === '\n') {
                        group.players.push(player)
                        player = new Player()
                        currentToken = TOKEN_PLAYER
                    }
                    continue
                } else if (currentToken === TOKEN_COMMENT && c === '\n') {
                    return [null, new Error(`neuzavřený komentář '${buffer.join('')}'`)]
                } else if (currentToken === TOKEN_COMMENT && c === '}') {
                    buffer.push(c)
                    const spec = buffer.join('')
                    player.plays.push(new Play(spec, idx - spec.length))
                    buffer = []
                    currentToken = TOKEN_SEPARATOR
                    continue
                } else if (currentToken === TOKEN_SEPARATOR && (c === ' ' || c === '\n')) {
                    if (buffer.length > 0) {
                        const spec = buffer.join('')
                        player.plays.push(new Play(spec, idx - spec.length))
                        buffer = []
                    }
                    if (c === ' ') {
                        currentToken = TOKEN_PLAY
                    } else {
                        group.players.push(player)
                        player = new Player()
                        currentToken = TOKEN_PLAYER
                    }
                    continue
                }
            }
            buffer.push(c)
        }
        
        if (buffer.length > 0) {
            const spec = buffer.join('')
            player.plays.push(new Play(spec, text.length - spec.length))
            buffer = []
        }

        group.players.push(player)
        player = new Player()
        groups.push(group)
        group = new Group()

        let [indexOpt, err] = this.parseIndexOption(opts)
        if (err !== null) {
            return [null, err]
        }

        const index = new Index()
        index.groups = groups
        index.date = date
        index.place = place
        index.opt = indexOpt

        err = this.checkIndex(index)
        if (err !== null) {
            return [null, err]
        }

        return [index, null]
    }

    /** @param {Index} index */
    checkIndex(index) {
        if (index.place.length === 0) {
            return new Error('prázdné místo')
        }

        for (const group of index.groups) {
            if (group.players === 0) {
                return new Error('prázdná skupina')
            }

            if (group.players.length < 3) {
                return new Error('nedostatečný počet hráčů ve skupině')
            }

            const set = new Set()
            for (const player of group.players) {
                if (set.has(player.name)) {
                    return new Error('opakující se hráč ve skupině')
                }
                set.add(player.name)
            }
        }

        return null
    }
    
    /** 
     * @param {string[]} tokens
     * @returns {[IndexOption, Error]} [opt, error]
     * */
    parseIndexOption(tokens) {
        const indexOpt = new IndexOption()
        for (const token of tokens) {
            if (token.length === 0) {
                continue
            }

            if (token === 'hundred=add' || token === 'sčítané-kilo') {
                indexOpt.hundredType = Hundred.ADD
            } else if (token === 'hundred=mult' || token === 'násobené-kilo') {
                indexOpt.hundredType = Hundred.MULTI
            } else if (token === 'multiplier=1' || token === 'desetníkový') {
                indexOpt.multiplier = 1
            } else if (token === 'multiplier=2' || token === 'dvacetníkový') {
                indexOpt.multiplier = 2
            } else if (token === 'multiplier=10' || token === 'korunový') {
                indexOpt.multiplier = 10
            } else {
                return [null, new Error(`neznámé nastavení indexu '${token}'`)]
            }
        }
        return [indexOpt, null]
    }
}

// Not used anymore
class TextIndexReader {
    /** 
     * @param {string} text 
     * @returns {[Index, Error]} [index, err]
     * */
    readIndex(text) {
        let place = ''
        /** @type {Date} */
        let date
        let isFirstLine = true
        let indexOpt = new IndexOption()
        /** @type {Player[]} */
        let players = []
        /** @type {Group[]} */
        const groups = []

        for (const line of text.split('\n')) {
            if (isFirstLine) {
                isFirstLine = false
                const datePlaceTokens = line.split(' ')
                date = Date.parse(datePlaceTokens[0])
                place = datePlaceTokens.slice(1).join(' ')

                const match = place.match(/^([^\{]*) {([^\{]*)}$/)
                if (match !== null) {
                    place = match[1]
                    /** @type {Error} */
                    let err
                    ;[indexOpt, err] = this.parseIndexOption(match[2])
                    if (err !== null) {
                        return [null, err]
                    }
                }
                
                if (place.includes('{')) {
                    return [null, new Error(`místo nesmí obsahovat znak '{'`)]
                }
                continue
            }

            if (line.length === 0 && players.length > 0) {
                groups.push(new Group(players))
                players = []
                continue
            }

            const namePlayTokens = line.split(' ')
            const playerName = namePlayTokens[0]
            const playTokens = this.splitPlaysWithComments(namePlayTokens.slice(1).join(' '))
            if (playerName === '') {
                return [null, new Error('prázdné jméno hráče')]
            }
            players.push(new Player(playerName, playTokens))
        }

        if (players.length > 0) {
            groups.push(new Group(players))
        }

        for (const group of groups) {
            if (group.players.length < 3) {
                return [null, new Error('nedostatečný počet hráčů ve skupině')]
            }

            const set = new Set()
            for (const player of group.players) {
                if (set.has(player.name)) {
                    return [null, new Error('opakující se hráč ve skupině')]
                }
                set.add(player.name)
            }
        }

        /** @type {Index} */
        return [{
            date: date,
            place: place,
            groups: groups,
            opt: indexOpt,
        }, null]
    }

    /** @param {string} text  */
    splitPlaysWithComments(text) {
        /** @type {string[]} */
        const result = []
        /** @type {string[]} */
        let builder = []
        let inComment = false

        for (const c of text) {
            if (c === '{') {
                inComment = true
            } else if (c === '}') {
                inComment = false
            } else if (c === ' ' && !inComment) {
                result.push(builder.join(''))
                builder = []
                continue
            }

            builder.push(c)
        }

        if (builder.length > 0) {
            result.push(builder.join(''))
        }
        return result
    }

    /** 
     * @param {string} text 
     * @returns {[IndexOption, Error]} [opt, error]
     * */
    parseIndexOption(text) {
        const indexOpt = new IndexOption()
        for (const token of text.split(' ')) {
            if (token.length === 0) {
                continue
            }

            if (token === 'hundred=add' || token === 'sčítané-kilo') {
                indexOpt.hundredType = Hundred.ADD
            } else if (token === 'hundred=mult' || token === 'násobené-kilo') {
                indexOpt.hundredType = Hundred.MULTI
            } else if (token === 'multiplier=1' || token === 'desetníkový') {
                indexOpt.multiplier = 1
            } else if (token === 'multiplier=2' || token === 'dvacetníkový') {
                indexOpt.multiplier = 2
            } else if (token === 'multiplier=10' || token === 'korunový') {
                indexOpt.multiplier = 10
            } else {
                return [null, new Error(`neznámé nastavení indexu '${token}'`)]
            }
        }
        return [indexOpt, null]
    }
}

class BalanceManager {
    /**
     * 
     * @param {Player} playerInPov 
     * @param {Index} index 
     * @returns {[number, Error]} [balance, error]
     */
    calculateBalanceForIndex(playerInPov, index) {
        let totalBalance = 0

        for (const group of index.groups) {
            let [balance, err] = this.calculateBalanceForGroup(playerInPov, group, index.opt)
            if (err !== null) {
                return [null, err]
            }

            totalBalance += balance
        }

        return [totalBalance, null]
    }

    /**
     * 
     * @param {Player} playerInPov 
     * @param {Group} group 
     * @param {IndexOption} indexOpt 
     * @returns {[number, Error]} [balance, error]
     */
    calculateBalanceForGroup(playerInPov, group, indexOpt) {
        // We have to create new evaluator for each group because each group can have
        // different number of members
        const evaluator = new SimpleEvaluator(group.players.length, indexOpt)

        let err = this.checkGroupBalance(evaluator, group)
        if (err !== null) {
            return [null, err]
        }

        if (group.players.find(x => x.name === playerInPov.name) === undefined) {
            // The input player (in point-of-view) is not part of the group
            return [0, null]
        }

        let totalBalance = 0

        for (const member of group.players) {
            let [balance, err] = this.calculateBalanceForMember(evaluator, playerInPov, member)
            if (err !== null) {
                return [null, err]
            }

            totalBalance += balance
        }

        return [totalBalance, null]
    }

    /**
     * 
     * @param {SimpleEvaluator} evaluator 
     * @param {Player} playerInPov 
     * @param {Player} groupMember 
     * @returns {[number, Error]} [balance, error]
     */
    calculateBalanceForMember(evaluator, playerInPov, groupMember) {
        let balance = 0

        for (const play of groupMember.plays) {
            const result = evaluator.evaluate(play.spec)
            if (!result.accepted) {
                return [null, new Error(`Hra '${play.spec}' (${play.startPos}. znak): ${result.errorMessage}`)]
            }

            if (playerInPov.name === groupMember.name) {
                balance += result.ownValue
            } else {
                balance += result.enemyValue
            }
        }

        return [balance, null]
    }

    /**
     * 
     * @param {SimpleEvaluator} evaluator 
     * @param {Group} group 
     */
    checkGroupBalance(evaluator, group) {
        let totalBalance = 0
        for (const playerInPov of group.players) {
            for (const member of group.players) {
                let [balance, err] = this.calculateBalanceForMember(evaluator, playerInPov, member)
                if (err !== null) {
                    return err
                }

                totalBalance += balance
            }
        }
        if (totalBalance !== 0) {
            return new Error('Suma bilancí všech hráčů ve skupině není rovna 0')
        }
        return null
    }
}

function setupElements() {
    document.getElementById('evaluate-play').addEventListener('input', onChangeEvaluatePlay)
    document.getElementById('group-size').addEventListener('change', onChangeEvaluatePlay)
    document.getElementById('hundred-type').addEventListener('change', onChangeEvaluatePlay)
    document.getElementById('multiplier').addEventListener('change', onChangeEvaluatePlay)
    document.getElementById('clear-evaluate-play').addEventListener('click', clearEvaluatePlay)
    document.getElementById('create-new-index').addEventListener('click', createNewIndex)
    document.getElementById('new-index-area').addEventListener('input', onChangeNewIndex)
    document.getElementById('new-index-area').addEventListener('selectionchange', onSelectionChangeNewIndex)
    document.getElementById('new-index-area').addEventListener('focus', onSelectionChangeNewIndex)
    document.getElementById('download-index').addEventListener('click', downloadIndex)
}

function downloadIndex() {
    const data = document.getElementById('new-index-area').value
    let fileName = 'index.txt'

    const reader = new TextIndexReaderV2()
    let [index, err] = reader.readIndex(data)
    if (err === null) {
        fileName = new Date(index.date).toISOString().slice(0, 10) + '_' + index.place + '.txt'
    }

    fileName = fileName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .replaceAll(' ', '_')
        .replace(/[<>:"/\\|?*]/g, '')
        .toLowerCase()

    const blob = new Blob([data], { type: 'text/plain' })
    const fileURL = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')
    downloadLink.href = fileURL
    downloadLink.download = fileName
    document.body.appendChild(downloadLink)
    downloadLink.click()
}

/** @param {number} */
function toCurrency(value) {
    return (value >= 0 ? '+' : '') + ((value / 100).toFixed(2)).replaceAll('.', ',') + ' Kč'
}

class EvaluatePlay {
    groupSize = 3
    play = new Play()
    hundredType = 'ADD'
    multiplier = 1
}

function onChangeEvaluatePlay() {
    const ep = new EvaluatePlay()

    ep.groupSize = parseInt(document.getElementById('group-size').value)
    ep.play.spec = document.getElementById('evaluate-play').value
    ep.hundredType = document.getElementById('hundred-type').value
    ep.multiplier = parseInt(document.getElementById('multiplier').value)

    localStorage.setItem('evaluatePlay', JSON.stringify(ep))

    const indexOption = new IndexOption()
    indexOption.hundredType = (ep.hundredType === 'ADD' ? Hundred.ADD : Hundred.MULTI)
    indexOption.multiplier = ep.multiplier

    const evaluator = new SimpleEvaluator(ep.groupSize, indexOption)
    const result = evaluator.evaluate(ep.play.spec)

    if (ep.play.spec.length > 0 && !result.accepted) {
        document.getElementById('evaluate-play-error').textContent = 'Chyba: ' + result.errorMessage
        document.getElementById('ownValue').textContent = ''
        document.getElementById('enemyValue').textContent = ''
        document.getElementById('evaluated-values').hidden = true
    } else {
        document.getElementById('evaluate-play-error').textContent = ''
        document.getElementById('ownValue').textContent = toCurrency(result.ownValue)
        document.getElementById('enemyValue').textContent = toCurrency(result.enemyValue) + '/os'
        document.getElementById('evaluated-values').hidden = false
    }

    reloadNewIndex()
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
    document.getElementById('evaluate-play').value = ep.play.spec
    document.getElementById('hundred-type').value = ep.hundredType
    document.getElementById('multiplier').value = ep.multiplier
}

function onChangeNewIndex() {
    localStorage.setItem('newIndex', document.getElementById('new-index-area').value)
    recalculateIndexBalance()
}

function onSelectionChangeNewIndex() {
    if (document.activeElement !== document.getElementById('new-index-area')) {
        // This can happen for example when the page is loaded
        return
    }

    const reader = new TextIndexReaderV2()
    const [index, err] = reader.readIndex(document.getElementById('new-index-area').value)

    if (err !== null) {
        return
    }

    const pos = document.getElementById('new-index-area').selectionStart

loop:
    for (const group of index.groups) {
        for (const player of group.players) {
            for (const play of player.plays) {
                const endPos = play.startPos + play.spec.length
                if (play.startPos <= pos && pos <= endPos) {
                    document.getElementById('evaluate-play').value = play.spec

                    // Set groupSize and indexOpt too
                    document.getElementById('group-size').value = group.players.length
                    document.getElementById('hundred-type').value = index.opt.hundredType
                    document.getElementById('multiplier').value = index.opt.multiplier

                    onChangeEvaluatePlay()
                    break loop
                }
            }
        }
    }
}

function createNewIndex() {
    if (confirm('Opravdu chcete resetovat index?')) {
        localStorage.setItem('newIndex', '')
        reloadNewIndex()
    }
}

function reloadNewIndex() {
    document.getElementById('new-index-area').value = localStorage.getItem('newIndex')
}

function recalculateIndexBalance() {
    document.getElementById('index-error').textContent = ''

    const block = document.getElementById('player-balances')
    block.innerHTML = ''

    const reader = new TextIndexReaderV2()
    const [index, err] = reader.readIndex(document.getElementById('new-index-area').value)
    if (err !== null) {
        document.getElementById('index-error').textContent = 'Chyba: ' + err.message
        return
    }

    const balanceManager = new BalanceManager()

    const uniqueNames = [...new Set(index.groups.flatMap(x => x.players.flatMap(x => x.name)))]
    uniqueNames.sort()

    for (const name of uniqueNames) {
        /** @type {Player} */
        const player = {
            name: name,
        }
        let [balance, err] = balanceManager.calculateBalanceForIndex(player, index)
        if (err !== null) {
            document.getElementById('index-error').textContent = 'Chyba: ' + err.message
            return
        }

        const div = document.createElement('div')
        const span = document.createElement('span')
        block.appendChild(div)
        div.appendChild(span)
        span.textContent = name + ': ' + toCurrency(balance)
    }
}
