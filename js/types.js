"use strict"

export class Part {
    constructor() {
        this.soloParity = false
        this.basePayment = false
        this.win = false
        this.boost = 0
        this.value = 0
        this.score = 100
        this.name = ''
    }
}

export class Result {
    constructor() {
        this.ownValue = 0
        this.enemyValue = 0
        /**
         * @type {string}
         */
        this.comment = null
        this.accepted = false
        this.basePart = new Part()
        this.linkPart = new Part()
        this.betterTrump = false
        this.errorMessage = ''
    }
}

export class BaseValues {
    static minGroupSize = 3
    static baseCeiling = 15000
    static game = 10
    static silentSeven = 10
    static seven = 20
    static silentHundred = 20
    static hundred = 40
    static betl = 150
    static majklBetl = 150
    static majklSuperBetl = 150
    static durch = 300
    static twoSevens = 400
    static minorFault = 100
    static majorFault = 500
    static fold = 60
}

export class ParityPayment {
    soloParity = false
    basePayment = false
}

export class Hundred {
    static get MULTI() { return 'MULTI' }
    static get ADD() { return 'ADD' }
}

export class IndexOption {
    hundredType = Hundred.MULTI
    multiplier = 1
}

export class Play {
    spec = ''
    startPos = -1

    constructor(spec, startPos) {
        if (spec !== undefined) {
            this.spec = spec
        }
        if (startPos !== undefined) {
            this.startPos = startPos
        }
    }
}

export class Player {
    name = ''
    /** @type {Play[]} */
    plays = []

    /**
     * 
     * @param {string} name 
     * @param {Play[]} plays 
     */
    constructor(name, plays) {
        if (name !== undefined) {
            this.name = name
        }
        if (plays !== undefined) {
            this.plays = [...plays]
        }
    }
}

export class Group {
    /** @type {Player[]} */
    players = []

    /** @param {Player[]} players */
    constructor(players) {
        if (players !== undefined) {
            this.players.push(...players)
        }
    }
}

export class Index {
    /** @type {Group[]} */
    groups = []
    date = new Date()
    place = ''
    opt = new IndexOption()
}