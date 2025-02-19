"use strict"

import { Tests } from './evaluator-tests.js'
import { BaseValues, IndexOption, Result, Hundred, ParityPayment, Index, Player, Group, Play } from './types.js'

document.addEventListener('DOMContentLoaded', async function() {
        if (window.location.pathname === '/') {
        const tests = new Tests()
        tests.runTests()

        setupElements()

        if (localStorage.getItem('evaluatePlay') === undefined) {
            onClearEvaluatePlay()
        } else {
            loadEvaluatePlay()
        }

        onChangeEvaluatePlay()
        recalculateIndexBalance()
    }
}, false)

class IndexFile {
    filename = ''
    text = ''
}

function onChangeFileChooser() {
    const files = document.getElementById('file-chooser').files
    const indexFiles = []

    document.getElementById('index-balance-title').textContent = ''
    document.getElementById('balance-error').textContent = ''
    document.getElementById('balance').textContent = ''

    for (const file of files) {
        const fileReader = new FileReader()
        fileReader.onload = (event) => {
            let indexFile = new IndexFile()
            indexFile = {
                filename: file.name,
                text: event.target.result,
            }
            indexFiles.push(indexFile)
            if (indexFiles.length === files.length) {
                let errMessage = ''
                const err = balance(indexFiles)
                if (err !== null) {
                    errMessage = err.message
                }
                document.getElementById('balance-error').textContent = errMessage
                document.getElementById('index-balance-title').textContent = `Bilance indexů (${files.length}):`
                document.getElementById('file-chooser').value = '' // we need this to be able to retrigger onChangeFileChooser again
            }
        }
        fileReader.readAsText(file) // UTF-8 encoding is assumed
    }
}

/** @param {IndexFile[]} indexFiles  */
function balance(indexFiles) {
    /** @type {Index[]} */
    const indexes = []
    
    for (const indexFile of indexFiles) {
        const reader = new TextIndexReaderV2()
        let [index, err] = reader.readIndex(indexFile.text.replaceAll(/\r/g, ''))
        if (err !== null) {
            return new Error(`Chyba (${indexFile.filename}): ` + err.message)
        }
        indexes.push(index)
    }

    const manager = new BalanceManager()
    /** @type {Map<string, number[]>} */
    const playerMap = new Map()

    for (const index of indexes) {
        for (const group of index.groups) {
            for (const player of group.players) {
                let [balance, err] = manager.calculateBalanceForGroup(player, group, index.opt)
                if (err !== null) {
                    return err
                }
                if (playerMap.has(player.name)) {
                    playerMap.get(player.name).push(balance)
                } else {
                    playerMap.set(player.name, [balance])
                }
            }
        }
    }

    const table = document.createElement('table')
    document.getElementById('balance').appendChild(table)

    const names = [...playerMap.keys()]
    const playerBalance = name => playerMap.get(name).reduce((x, y) => x + y, 0)
    // Sort by player's balance then by player's name
    names.sort((a, b) => cmp(playerBalance(b), playerBalance(a)) || cmp(a, b))

    for (const name of names) {
        const balances = playerMap.get(name)
        const tr = document.createElement('tr')
        table.appendChild(tr)
        const nameData = document.createElement('td')
        tr.appendChild(nameData)
        nameData.textContent = name

        const balanceData = document.createElement('td')
        tr.appendChild(balanceData)
        balanceData.textContent = toCurrency(balances.reduce((a, b) => a + b, 0))
        balanceData.style = 'text-align: right; padding-left: 8px'
    }
    return null
}

function cmp(a, b) {
    if (a > b) {
        return 1
    } else if (a < b) {
        return -1
    }
    return 0
}

async function fetchIndexes() {
    return loadIndexList()
        .then(async (names) => {
            return await Promise.all(names.map(async name => {
                const response = await fetch('index/' + name + '?' + Date.now())
                const text = await response.text()
                const indexFile = new IndexFile()
                indexFile.filename = name
                indexFile.text = text
                return indexFile
            }))
        })
}

async function loadIndexList() {
    return fetch('index-list.txt?' + Date.now())
        .then((response) => response.text())
        .then((text) => {
            return text.split('\n')
                .map(x => x.trim())
        })
}

class SimpleParser {
    /**
     * 
     * @param {string} playString 
     */
    parse(playString) {
        let result = new Result()
        let play = playString.trim()

        const commentRegex = /\{([^}]*)\}$/
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
            throw new Error('velikost skupiny je menší než ' + BaseValues.minGroupSize)
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
            const next = text[idx+1] // undefined if out of bounds

            if (isFirstLine) {
                if (currentToken === TOKEN_DATE && c === ' ') {
                    // Date will be NaN if parse fails
                    date = Date.parse(buffer.join(''))
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
                    // Open new player
                    if (group.players.length === 0) {
                        // Open new group
                        groups.push(group)
                    }
                    player = new Player()
                    group.players.push(player)
                    player.name = buffer.join('')
                    buffer = []
                    currentToken = TOKEN_PLAY
                    continue
                }

                if (currentToken === TOKEN_PLAYER && c === '\n') {
                    if (buffer.length > 0) {
                        // Open new player (with no plays) and close him
                        if (group.players.length === 0) {
                            // Open new group
                            groups.push(group)
                        }
                        player = new Player()
                        group.players.push(player)
                        player.name = buffer.join('')
                        buffer = []
                    } else {
                        // Close the group
                        group = new Group()
                    }
                    currentToken = TOKEN_PLAYER
                    continue
                }

                if (currentToken === TOKEN_PLAY && c === '{') {
                    // Open the comment
                    buffer.push(c)
                    currentToken = TOKEN_COMMENT
                    continue
                }
                
                if (currentToken === TOKEN_PLAY && (c === ' ' || c === '\n')) {
                    if (buffer.length > 0) {
                        // Add new play
                        const spec = buffer.join('')
                        player.plays.push(new Play(spec, idx - spec.length))
                        buffer = []
                    }
                    if (c === '\n') {
                        // Close the player
                        currentToken = TOKEN_PLAYER
                    } else {
                        currentToken = TOKEN_PLAY
                    }
                    continue
                }
                
                if (currentToken === TOKEN_COMMENT && c === '\n') {
                    // Unclosed comment: this will result in an error later
                    if (buffer.length > 0) {
                        // Add new play
                        const spec = buffer.join('')
                        player.plays.push(new Play(spec, idx - spec.length))
                        buffer = []
                    }
                    currentToken = TOKEN_PLAYER
                    continue
                }
                
                if (currentToken === TOKEN_COMMENT && c === '}') {
                    // Close the comment
                    buffer.push(c)
                    const spec = buffer.join('')
                    player.plays.push(new Play(spec, idx - spec.length))
                    buffer = []
                    if (next === ' ') {
                        idx++
                        currentToken = TOKEN_PLAY
                    } else if (next === '\n') {
                        // Close the player
                        idx++
                        currentToken = TOKEN_PLAYER
                    } else if (next === undefined) {
                        // End of index
                    } else {
                        throw new Error('neočekávaný znak za komentářem: ' + next)
                    }
                    continue
                }
            }
            buffer.push(c)
        }
        
        if (buffer.length > 0) {
            if (currentToken === TOKEN_PLAY) {
                const spec = buffer.join('')
                buffer = []
                player.plays.push(new Play(spec, text.length - spec.length))
            } else if (currentToken === TOKEN_PLAYER) {
                // Open new player and close him
                if (group.players.length === 0) {
                    // Open new group
                    groups.push(group)
                }
                player = new Player()
                player.name = buffer.join('')
                buffer = []
                group.players.push(player)
            } else {
                return [null, new Error(`nerozpoznané znaky na konci indexu '${buffer.join('')}' (aktuální typ tokenu: ${currentToken})`)]
            }
        }

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
        if (index.date === undefined && index.place.length === 0 && index.groups.length === 0) {
            // Empty index
            return null
        }

        if (isNaN(index.date)) {
            return new Error('prázdné/nevalidní datum')
        }

        if (index.place.length === 0) {
            return new Error('prázdné místo')
        }

        for (const [groupIdx, group] of index.groups.entries()) {
            if (group.players === 0) {
                return new Error(`${groupIdx+1}. skupina je prázdná`)
            }

            if (group.players.length < 3) {
                return new Error(`nedostatečný počet hráčů (${group.players.length}) v ${groupIdx+1}. skupině`)
            }

            const evaluator = new SimpleEvaluator(group.players.length, index.opt)

            const set = new Set()
            for (const [playerIdx, player] of group.players.entries()) {
                if (player.name.length === 0) {
                    return new Error(`${playerIdx+1}. hráč v ${groupIdx+1}. skupině má prázdné jméno`)
                }
                if (set.has(player.name)) {
                    return new Error(`opakující se hráč '${player.name}' v ${groupIdx+1}. skupině`)
                }
                set.add(player.name)

                for (const [playIdx, play] of player.plays.entries()) {
                    const result = evaluator.evaluate(play.spec)
                    if (!result.accepted) {
                        return new Error(`hra '${play.spec}' (${groupIdx+1}. skupina, hráč '${player.name}', ${playIdx+1}. hra): ${result.errorMessage}`)
                    }
                }
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

            if (token === 'hundred=add' || token === 'sčítané-kilo' || token === 'k+') {
                indexOpt.hundredType = Hundred.ADD
            } else if (token === 'hundred=mult' || token === 'násobené-kilo' || token === 'k*') {
                indexOpt.hundredType = Hundred.MULTI
            } else if (token === 'multiplier=1' || token === 'desetníkový' || token === '1x') {
                indexOpt.multiplier = 1
            } else if (token === 'multiplier=2' || token === 'dvacetníkový' || token === '2x') {
                indexOpt.multiplier = 2
            } else if (token === 'multiplier=10' || token === 'korunový' || token === '10x') {
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

        for (const [groupIdx, group] of index.groups.entries()) {
            let [balance, err] = this.calculateBalanceForGroup(playerInPov, group, index.opt)
            if (err !== null) {
                return [null, new Error(`(${groupIdx+1}. skupina): ` + err.message)]
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
                throw new Error(`hra '${play.spec}' (${play.startPos}. znak): ${result.errorMessage}`)
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
            return new Error('suma bilancí všech hráčů ve skupině není rovna 0')
        }
        return null
    }
}

function setupElements() {
    document.getElementById('evaluate-play').addEventListener('input', onChangeEvaluatePlay)
    document.getElementById('group-size').addEventListener('change', onChangeEvaluatePlay)
    document.getElementById('hundred-type').addEventListener('change', onChangeEvaluatePlay)
    document.getElementById('multiplier').addEventListener('change', onChangeEvaluatePlay)
    document.getElementById('clear-evaluate-play').addEventListener('click', onClearEvaluatePlay)
    document.getElementById('create-new-index').addEventListener('click', createNewIndex)
    document.getElementById('new-index-area').addEventListener('input', onChangeNewIndex)
    document.getElementById('new-index-area').addEventListener('selectionchange', onSelectionChangeNewIndex)
    document.getElementById('new-index-area').addEventListener('focus', onSelectionChangeNewIndex)
    document.getElementById('download-index').addEventListener('click', downloadIndex)
    document.getElementById('file-chooser').addEventListener('change', onChangeFileChooser)
    document.getElementById('file-chooser-button').addEventListener('click', () => {
        document.getElementById('index-balance-title').textContent = ''
        document.getElementById('balance').textContent = ''
        document.getElementById('balance-error').textContent = ''
        document.getElementById('file-chooser').click()
    })
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

/** @param {number} value */
function toCurrency(value) {
    let sign = ''
    if (value > 0) {
        sign = '+'
    }
    return sign + ((value / 100).toFixed(2)).replaceAll('.', ',') + ' Kč'
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

    let errMessage = 'Chyba: ' + result.errorMessage
    let ownValue = ''
    let enemyValue = ''
    let display = 'none'

    if (ep.play.spec.length === 0 || result.accepted) {
        errMessage = ''
        ownValue = toCurrency(result.ownValue)
        enemyValue = toCurrency(result.enemyValue) + '/os'
        display = 'inline'
    }

    document.getElementById('evaluate-play-error').textContent = errMessage
    document.getElementById('own-value').textContent = ownValue
    document.getElementById('enemy-value').textContent = enemyValue
    document.getElementById('evaluated-values').style = 'display: ' + display

    let width = getTextWidth(document.getElementById('evaluate-play').value)
    document.getElementById('evaluate-play').style.width = width + 'px'

    reloadNewIndex()
}

function getTextWidth(text) {
    const div = document.getElementById('invisible-div')
    div.innerText = text
    return div.clientWidth
}

function onClearEvaluatePlay() {
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

    const balanceMap = new Map()

    for (const name of index.groups.flatMap(x => x.players.flatMap(x => x.name))) {
        /** @type {Player} */
        const player = {
            name: name,
        }
        let [balance, err] = balanceManager.calculateBalanceForIndex(player, index)
        if (err !== null) {
            document.getElementById('index-error').textContent = 'Chyba: ' + err.message
            return
        }
        balanceMap.set(name, balance)
    }

    const uniqueNames = [...new Set(index.groups.flatMap(x => x.players.flatMap(x => x.name)))]
    uniqueNames.sort((a, b) => cmp(balanceMap.get(b), balanceMap.get(a)) || cmp(a, b))

    block.appendChild(document.createElement('hr'))
    const table = document.createElement('table')
    table.id = 'balance-table'
    block.appendChild(table)

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

        const tr = document.createElement('tr')
        table.appendChild(tr)
        const nameData = document.createElement('td')
        tr.appendChild(nameData)
        nameData.textContent = name
        const balanceData = document.createElement('td')
        balanceData.style = 'text-align: right; padding-left: 8px'
        tr.appendChild(balanceData)
        balanceData.textContent = toCurrency(balance)
    }
}
