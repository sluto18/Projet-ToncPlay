const LEVELS = [
    // ─────────────────────────────────────────────
    //  ACTE 1 : Decouverte (Niveaux 1-10)
    // ─────────────────────────────────────────────
    {
        name: "L'Eveil", // niveau 1
        par: 6,
        difficulty: 'easy',
        quadrants: [1, 2, 3, 4],
        firstTarget: { row: 13, col: 6, color: "green", symbol: "\u25CB" },
        robots: [
            { "id": "red", "row": 1, "col": 4 },
            { "id": "blue", "row": 13, "col": 2 },
            { "id": "green", "row": 6, "col": 14 },
            { "id": "yellow", "row": 10, "col": 5 },
            { "id": "black", "row": 2, "col": 9 }
        ],
    },
    {
        name: "Premiers Pas", // niveau 2
        par: 2,
        difficulty: 'easy',
        quadrants: [5, 2, 3, 4],
        firstTarget: { row: 6, col: 13, color: "yellow", symbol: "\u2295" },
        robots: [
            { id: "red", row: 3, col: 12 },
            { id: "blue", row: 6, col: 12 },
            { id: "green", row: 0, col: 0 },
            { id: "yellow", row: 6, col: 11 },
            { id: "black", row: 15, col: 15 }
        ]
    },
    {
        name: "Le Carrefour", // niveau 3
        par: 3,
        difficulty: 'easy',
        quadrants: [1, 6, 3, 4],
        firstTarget: { row: 4, col: 3, color: "red", symbol: "\u25A1" },
        robots: [
            { id: "red", row: 4, col: 0 },
            { id: "blue", row: 4, col: 1 },
            { id: "green", row: 4, col: 2 },
            { id: "yellow", row: 0, col: 1 },
            { id: "black", row: 15, col: 15 }
        ]
    },
    {
        name: "Le Couloir", // niveau 4
        par: 9,
        difficulty: 'easy',
        quadrants: [1, 2, 7, 4],
        firstTarget: { row: 12, col: 1, color: "green", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 9, col: 1 },
            { id: "blue", row: 10, col: 1 },
            { id: "green", row: 15, col: 1 },
            { id: "yellow", row: 0, col: 1 },
            { id: "black", row: 15, col: 15 }
        ]
    },
    {
        name: "La Place", // niveau 5
        par: 4,
        difficulty: 'easy',
        quadrants: [1, 2, 3, 8],
        firstTarget: { row: 10, col: 10, color: "yellow", symbol: "\u2295" },
        robots: [
            { id: "red", row: 0, col: 10 },
            { id: "blue", row: 11, col: 10 },
            { id: "green", row: 10, col: 14 },
            { id: "yellow", row: 5, col: 10 },
            { id: "black", row: 15, col: 15 }
        ]
    },
    {
        name: "Le Virage", // niveau 6
        par: 7,
        difficulty: 'easy',
        quadrants: [5, 6, 3, 4],
        firstTarget: { row: 3, col: 2, color: "blue", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 7, col: 0 },
            { id: "blue", row: 3, col: 5 },
            { id: "green", row: 0, col: 2 },
            { id: "yellow", row: 2, col: 4 },
            { id: "black", row: 15, col: 15 }
        ]
    },
    {
        name: "Le Pont", // niveau 7
        par: 4,
        difficulty: 'easy',
        quadrants: [5, 2, 7, 4],
        firstTarget: { row: 11, col: 6, color: "blue", symbol: "\u2295" },
        robots: [
            { id: "red", row: 9, col: 6 },
            { id: "blue", row: 6, col: 0 },
            { id: "green", row: 10, col: 6 },
            { id: "yellow", row: 0, col: 6 },
            { id: "black", row: 6, col: 3 }
        ]
    },
    {
        name: "Le Rond-Point", // niveau 8
        par: 5,
        difficulty: 'easy',
        quadrants: [1, 6, 7, 4],
        firstTarget: { row: 4, col: 10, color: "green", symbol: "\u25A1" },
        robots: [
            { id: "red", row: 4, col: 12 },
            { id: "blue", row: 4, col: 11 },
            { id: "green", row: 0, col: 2 },
            { id: "yellow", row: 6, col: 10 },
            { id: "black", row: 2, col: 10 }
        ]
    },
    {
        name: "L'Impasse", // niveau 9
        par: 2,
        difficulty: 'easy',
        quadrants: [1, 2, 7, 8],
        firstTarget: { row: 14, col: 11, color: "green", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 14, col: 13 },
            { id: "blue", row: 14, col: 9 },
            { id: "green", row: 9, col: 11 },
            { id: "yellow", row: 12, col: 11 },
            { id: "black", row: 0, col: 0 }
        ]
    },
    {
        name: "Le Passage", // niveau 10
        par: 4,
        difficulty: 'easy',
        quadrants: [5, 6, 7, 4],
        firstTarget: { row: 14, col: 4, color: "red", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 14, col: 6 },
            { id: "blue", row: 14, col: 5 },
            { id: "green", row: 10, col: 4 },
            { id: "yellow", row: 0, col: 4 },
            { id: "black", row: 15, col: 15 }
        ]
    },

    // ─────────────────────────────────────────────
    //  ACTE 2 : Aventure (Niveaux 11-22)
    // ─────────────────────────────────────────────
    {
        name: "L'Horizon", // niveau 11 
        par: 9,
        difficulty: 'medium',
        quadrants: [5, 6, 7, 8],
        firstTarget: { row: 5, col: 1, color: "red", symbol: "\u25A1" },
        robots: [
            { id: "red", row: 12, col: 15 },
            { id: "blue", row: 5, col: 3 },
            { id: "green", row: 0, col: 1 },
            { id: "yellow", row: 5, col: 5 },
            { id: "black", row: 15, col: 0 }
        ]
    },
    {
        name: "Le Detour", // niveau 12
        par: 5,
        difficulty: 'medium',
        quadrants: [1, 6, 3, 8],
        firstTarget: { row: 3, col: 13, color: "yellow", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 3, col: 14 },
            { id: "blue", row: 3, col: 15 },
            { id: "green", row: 0, col: 13 },
            { id: "yellow", row: 0, col: 15 },
            { id: "black", row: 15, col: 15 }
        ]
    },
    {
        name: "La Traverse", // niveau 13
        par: 9,
        difficulty: 'medium',
        quadrants: [5, 2, 3, 8],
        firstTarget: { row: 9, col: 4, color: "yellow", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 9, col: 6 },
            { id: "blue", row: 12, col: 4 },
            { id: "green", row: 0, col: 4 },
            { id: "yellow", row: 15, col: 14 },
            { id: "black", row: 6, col: 4 }
        ]
    },
    {
        name: "Le Labyrinthe", // niveau 14
        par: 7,
        difficulty: 'medium',
        quadrants: [5, 2, 7, 8],
        firstTarget: { row: 4, col: 8, color: "blue", symbol: "\u2295" },
        robots: [
            { id: "red", row: 4, col: 10 },
            { id: "blue", row: 0, col: 9 },
            { id: "green", row: 4, col: 9 },
            { id: "yellow", row: 4, col: 11 },
            { id: "black", row: 6, col: 8 }
        ]
    },
    {
        name: "Le Carre", // niveau 15
        par: 5,
        difficulty: 'medium',
        quadrants: [1, 6, 7, 8],
        firstTarget: { row: 9, col: 12, color: "blue", symbol: "\u25A1" },
        robots: [
            { id: "red", row: 9, col: 14 },
            { id: "blue", row: 8, col: 13 },
            { id: "green", row: 9, col: 13 },
            { id: "yellow", row: 8, col: 14 },
            { id: "black", row: 15, col: 15 }
        ]
    },
    {
        name: "Le Siphon", // niveau 16
        par: 7,
        difficulty: 'medium',
        quadrants: [5, 6, 3, 8],
        firstTarget: { row: 12, col: 14, color: "red", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 10, col: 14 },
            { id: "blue", row: 12, col: 15 },
            { id: "green", row: 12, col: 13 },
            { id: "yellow", row: 15, col: 14 },
            { id: "black", row: 0, col: 14 }
        ]
    },
    {
        name: "La Spirale", // niveau 17
        par: 8,
        difficulty: 'medium',
        quadrants: [1, 2, 3, 4],
        firstTarget: { row: 1, col: 5, color: "blue", symbol: "\u25A1" },
        robots: [
            { id: "red", row: 0, col: 5 },
            { id: "blue", row: 15, col: 5 },
            { id: "green", row: 2, col: 5 },
            { id: "yellow", row: 4, col: 5 },
            { id: "black", row: 6, col: 5 }
        ]
    },
    {
        name: "L'Echelle", // niveau 18
        par: 6,
        difficulty: 'medium',
        quadrants: [5, 6, 3, 4],
        firstTarget: { row: 11, col: 12, color: "red", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 15, col: 13 },
            { id: "blue", row: 9, col: 12 },
            { id: "green", row: 13, col: 12 },
            { id: "yellow", row: 10, col: 12 },
            { id: "black", row: 14, col: 12 }
        ]
    },
    {
        name: "Le Reseau", // niveau 19
        par: 6,
        difficulty: 'medium',
        quadrants: [1, 2, 7, 8],
        firstTarget: { row: 5, col: 13, color: "green", symbol: "\u2295" },
        robots: [
            { id: "red", row: 5, col: 15 },
            { id: "blue", row: 5, col: 14 },
            { id: "green", row: 15, col: 9 },
            { id: "yellow", row: 3, col: 13 },
            { id: "black", row: 4, col: 13 }
        ]
    },
    {
        name: "La Boucle", // niveau 20
        par: 6,
        difficulty: 'medium',
        quadrants: [5, 2, 3, 4],
        firstTarget: { row: 3, col: 3, color: "green", symbol: "\u2295" },
        robots: [
            { id: "red", row: 3, col: 4 },
            { id: "blue", row: 0, col: 3 },
            { id: "green", row: 15, col: 13 },
            { id: "yellow", row: 3, col: 5 },
            { id: "black", row: 1, col: 3 }
        ]
    },
    {
        name: "Le Miroir", // niveau 21
        par: 5,
        difficulty: 'medium',
        quadrants: [1, 6, 7, 4],
        firstTarget: { row: 14, col: 4, color: "red", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 14, col: 6 },
            { id: "blue", row: 14, col: 5 },
            { id: "green", row: 0, col: 14 },
            { id: "yellow", row: 14, col: 3 },
            { id: "black", row: 10, col: 4 }
        ]
    },
    {
        name: "La Clef", // niveau 22
        par: 6,
        difficulty: 'medium',
        quadrants: [5, 6, 7, 4],
        firstTarget: { row: 9, col: 10, color: "yellow", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 9, col: 12 },
            { id: "blue", row: 11, col: 10 },
            { id: "green", row: 14, col: 1 },
            { id: "yellow", row: 0, col: 0 },
            { id: "black", row: 5, col: 7 }
        ]
    },

    // ─────────────────────────────────────────────
    //  ACTE 3 : Expert (Niveaux 23-36)
    // ─────────────────────────────────────────────
    {
        name: "Le Mecano", // niveau 23
        par: 7,
        difficulty: 'hard',
        quadrants: [5, 6, 7, 8],
        firstTarget: { row: 2, col: 11, color: "red", symbol: "\u2295" },
        robots: [
            { id: "red", row: 14, col: 1 },
            { id: "blue", row: 2, col: 13 },
            { id: "green", row: 0, col: 12 },
            { id: "yellow", row: 5, col: 11 },
            { id: "black", row: 2, col: 9 }
        ]
    },
    {
        name: "L'Engrenage", // niveau 24
        par: 8,
        difficulty: 'hard',
        quadrants: [1, 6, 3, 8],
        firstTarget: { row: 14, col: 11, color: "green", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 14, col: 13 },
            { id: "blue", row: 12, col: 11 },
            { id: "green", row: 14, col: 9 },
            { id: "yellow", row: 15, col: 11 },
            { id: "black", row: 14, col: 10 }
        ]
    },
    {
        name: "La Turbine", // niveau 25
        par: 9,
        difficulty: 'hard',
        quadrants: [5, 2, 7, 4],
        firstTarget: { row: 4, col: 8, color: "blue", symbol: "\u2295" },
        robots: [
            { id: "red", row: 4, col: 10 },
            { id: "blue", row: 15, col: 12 },
            { id: "green", row: 2, col: 8 },
            { id: "yellow", row: 4, col: 9 },
            { id: "black", row: 6, col: 8 }
        ]
    },
    {
        name: "Le Piston", // niveau 26
        par: 6,
        difficulty: 'hard',
        quadrants: [1, 2, 7, 8],
        firstTarget: { row: 12, col: 1, color: "green", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 10, col: 1 },
            { id: "blue", row: 11, col: 1 },
            { id: "green", row: 0, col: 14 },
            { id: "yellow", row: 13, col: 1 },
            { id: "black", row: 9, col: 1 }
        ]
    },
    {
        name: "La Chaudiere", // niveau 27
        par: 4,
        difficulty: 'hard',
        quadrants: [5, 6, 3, 4],
        firstTarget: { row: 9, col: 4, color: "yellow", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 9, col: 6 },
            { id: "blue", row: 9, col: 5 },
            { id: "green", row: 11, col: 4 },
            { id: "yellow", row: 0, col: 4 },
            { id: "black", row: 13, col: 4 }
        ]
    },
    {
        name: "Le Levier", // niveau 28
        par: 6,
        difficulty: 'hard',
        quadrants: [1, 6, 7, 8],
        firstTarget: { row: 1, col: 5, color: "blue", symbol: "\u25A1" },
        robots: [
            { id: "red", row: 1, col: 7 },
            { id: "blue", row: 15, col: 12 },
            { id: "green", row: 1, col: 6 },
            { id: "yellow", row: 3, col: 5 },
            { id: "black", row: 0, col: 5 }
        ]
    },
    {
        name: "La Pression", // niveau 29
        par: 3,
        difficulty: 'hard',
        quadrants: [5, 2, 3, 8],
        firstTarget: { row: 10, col: 10, color: "yellow", symbol: "\u2295" },
        robots: [
            { id: "red", row: 10, col: 12 },
            { id: "blue", row: 10, col: 11 },
            { id: "green", row: 9, col: 10 },
            { id: "yellow", row: 15, col: 0 },
            { id: "black", row: 11, col: 0 }
        ]
    },
    {
        name: "L'Aimant", // niveau 30
        par: 8,
        difficulty: 'hard',
        quadrants: [5, 6, 7, 4],
        firstTarget: { row: 13, col: 9, color: "blue", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 14, col: 11 },
            { id: "blue", row: 0, col: 0 },
            { id: "green", row: 13, col: 10 },
            { id: "yellow", row: 15, col: 0 },
            { id: "black", row: 4, col: 7 }
        ]
    },
    {
        name: "Le Circuit", // niveau 31
        par: 9,
        difficulty: 'hard',
        quadrants: [1, 2, 3, 8],
        firstTarget: { row: 14, col: 3, color: "red", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 0, col: 14 },
            { id: "blue", row: 15, col: 7 },
            { id: "green", row: 14, col: 4 },
            { id: "yellow", row: 12, col: 3 },
            { id: "black", row: 10, col: 3 }
        ]
    },
    {
        name: "La Frequence", // niveau 32
        par: 8,
        difficulty: 'hard',
        quadrants: [5, 6, 7, 8],
        firstTarget: { row: 2, col: 6, color: "yellow", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 7, col: 10 },
            { id: "blue", row: 0, col: 6 },
            { id: "green", row: 4, col: 6 },
            { id: "yellow", row: 0, col: 13 },
            { id: "black", row: 2, col: 4 }
        ]
    },
    {
        name: "L'Rotor", // niveau 33
        par: 5,
        difficulty: 'hard',
        quadrants: [1, 6, 3, 4],
        firstTarget: { row: 11, col: 12, color: "red", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 15, col: 0 },
            { id: "blue", row: 11, col: 14 },
            { id: "green", row: 11, col: 13 },
            { id: "yellow", row: 0, col: 12 },
            { id: "black", row: 13, col: 12 }
        ]
    },
    {
        name: "Le Volant", // niveau 34
        par: 8,
        difficulty: 'hard',
        quadrants: [5, 2, 7, 8],
        firstTarget: { row: 5, col: 13, color: "green", symbol: "\u2295" },
        robots: [
            { id: "red", row: 5, col: 15 },
            { id: "blue", row: 3, col: 4 },
            { id: "green", row: 15, col: 1 },
            { id: "yellow", row: 5, col: 14 },
            { id: "black", row: 6, col: 13 }
        ]
    },
    {
        name: "La Dynamo", // niveau 35
        par: 8,
        difficulty: 'hard',
        quadrants: [1, 6, 7, 4],
        firstTarget: { row: 14, col: 4, color: "red", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 0, col: 14 },
            { id: "blue", row: 9, col: 1 },
            { id: "green", row: 3, col: 10 },
            { id: "yellow", row: 14, col: 6 },
            { id: "black", row: 13, col: 5 }
        ]
    },
    {
        name: "Le Reacteur", // niveau 36
        par: 8,
        difficulty: 'hard',
        quadrants: [5, 6, 3, 8],
        firstTarget: { row: 12, col: 14, color: "red", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 0, col: 0 },
            { id: "blue", row: 15, col: 12 },
            { id: "green", row: 10, col: 1 },
            { id: "yellow", row: 12, col: 15 },
            { id: "black", row: 14, col: 14 }
        ]
    },

    // ─────────────────────────────────────────────
    //  ACTE 4 : Maitre (Niveaux 37-50)
    // ─────────────────────────────────────────────
    {
        name: "Le Transformateur", // niveau 37
        par: 7,
        difficulty: 'hard',
        quadrants: [1, 2, 7, 4],
        firstTarget: { row: 13, col: 9, color: "blue", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 2, col: 12 },
            { id: "blue", row: 0, col: 0 },
            { id: "green", row: 10, col: 3 },
            { id: "yellow", row: 15, col: 9 },
            { id: "black", row: 14, col: 11 }
        ]
    },
    {
        name: "Le Condensateur", // niveau 38
        par: 5,
        difficulty: 'hard',
        quadrants: [5, 2, 7, 4],
        firstTarget: { row: 1, col: 10, color: "red", symbol: "\u2295" },
        robots: [
            { id: "red", row: 15, col: 1 },
            { id: "blue", row: 8, col: 14 },
            { id: "green", row: 12, col: 3 },
            { id: "yellow", row: 1, col: 12 },
            { id: "black", row: 0, col: 10 }
        ]
    },
    {
        name: "La Diode", // niveau 39
        par: 3,
        difficulty: 'hard',
        quadrants: [1, 6, 3, 4],
        firstTarget: { row: 2, col: 11, color: "red", symbol: "\u2295" },
        robots: [
            { id: "red", row: 15, col: 3 },
            { id: "blue", row: 0, col: 1 },
            { id: "green", row: 12, col: 14 },
            { id: "yellow", row: 2, col: 13 },
            { id: "black", row: 4, col: 11 }
        ]
    },
    {
        name: "La Resistance", // niveau 40
        par: 9,
        difficulty: 'hard',
        quadrants: [5, 6, 7, 8],
        firstTarget: { row: 14, col: 11, color: "green", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 3, col: 14 },
            { id: "blue", row: 9, col: 2 },
            { id: "green", row: 0, col: 0 },
            { id: "yellow", row: 14, col: 13 },
            { id: "black", row: 14, col: 9 }
        ]
    },
    {
        name: "Le Fusible", // niveau 41
        par: 6,
        difficulty: 'hard',
        quadrants: [1, 2, 3, 8],
        firstTarget: { row: 12, col: 6, color: "blue", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 2, col: 3 },
            { id: "blue", row: 0, col: 14 },
            { id: "green", row: 10, col: 12 },
            { id: "yellow", row: 12, col: 4 },
            { id: "black", row: 15, col: 6 }
        ]
    },
    {
        name: "L'Inductance", // niveau 42
        par: 4,
        difficulty: 'hard',
        quadrants: [5, 6, 3, 8],
        firstTarget: { row: 13, col: 6, color: "green", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 4, col: 1 },
            { id: "blue", row: 0, col: 14 },
            { id: "green", row: 15, col: 12 },
            { id: "yellow", row: 13, col: 4 },
            { id: "black", row: 15, col: 6 }
        ]
    },
    {
        name: "La Bobine", // niveau 43
        par: 7,
        difficulty: 'hard',
        quadrants: [1, 6, 7, 8],
        firstTarget: { row: 4, col: 3, color: "red", symbol: "\u25A1" },
        robots: [
            { id: "red", row: 15, col: 14 },
            { id: "blue", row: 0, col: 10 },
            { id: "green", row: 12, col: 1 },
            { id: "yellow", row: 4, col: 5 },
            { id: "black", row: 6, col: 3 }
        ]
    },
    {
        name: "Le Relais", // niveau 44
        par: 6,
        difficulty: 'hard',
        quadrants: [5, 2, 3, 8],
        firstTarget: { row: 3, col: 2, color: "blue", symbol: "\u25CB" },
        robots: [
            { id: "red", row: 0, col: 12 },
            { id: "blue", row: 15, col: 13 },
            { id: "green", row: 10, col: 3 },
            { id: "yellow", row: 3, col: 4 },
            { id: "black", row: 0, col: 2 }
        ]
    },
    {
        name: "Le Commutateur", // niveau 45 
        par: 8,
        difficulty: 'hard',
        quadrants: [1, 2, 3, 4],
        firstTarget: { row: 6, col: 13, color: "yellow", symbol: "\u2295" },
        robots: [
            { id: "red", row: 0, col: 5 },
            { id: "blue", row: 12, col: 10 },
            { id: "green", row: 6, col: 12 },
            { id: "yellow", row: 15, col: 1 },
            { id: "black", row: 4, col: 13 }
        ]
    },
    {
        name: "L'Amplificateur", // niveau 46
        par: 3,
        difficulty: 'hard',
        quadrants: [5, 2, 7, 8],
        firstTarget: { row: 11, col: 6, color: "blue", symbol: "\u2295" },
        robots: [
            { id: "red", row: 3, col: 1 },
            { id: "blue", row: 0, col: 14 },
            { id: "green", row: 11, col: 12 },
            { id: "yellow", row: 11, col: 4 },
            { id: "black", row: 13, col: 6 }
        ]
    },
    {
        name: "Le Transistor", // niveau 47
        par: 6,
        difficulty: 'hard',
        quadrants: [1, 6, 3, 8],
        firstTarget: { row: 10, col: 10, color: "yellow", symbol: "\u2295" },
        robots: [
            { id: "red", row: 0, col: 5 },
            { id: "blue", row: 3, col: 14 },
            { id: "green", row: 10, col: 12 },
            { id: "yellow", row: 6, col: 0 },
            { id: "black", row: 10, col: 9 }
        ]
    },
    {
        name: "Le Microprocesseur", // niveau 48
        par: 8,
        difficulty: 'hard',
        quadrants: [5, 6, 3, 4],
        firstTarget: { row: 2, col: 6, color: "yellow", symbol: "\u25B3" },
        robots: [
            { id: "red", row: 0, col: 1 },
            { id: "blue", row: 12, col: 10 },
            { id: "green", row: 2, col: 4 },
            { id: "yellow", row: 15, col: 14 },
            { id: "black", row: 4, col: 6 }
        ]
    },
    {
        name: "L'Algorithme", // niveau 49
        par: 7,
        difficulty: 'hard',
        quadrants: [1, 2, 7, 8],
        firstTarget: { row: 6, col: 1, color: "yellow", symbol: "\u25A1" },
        robots: [
            { id: "red", row: 0, col: 10 },
            { id: "blue", row: 12, col: 5 },
            { id: "green", row: 6, col: 3 },
            { id: "yellow", row: 10, col: 11 },
            { id: "black", row: 4, col: 1 }
        ]
    },
    {
        name: "Le Supraconducteur", // niveau 50
        par: 8,
        difficulty: 'hard',
        quadrants: [5, 6, 7, 4],
        firstTarget: { row: 4, col: 10, color: "green", symbol: "\u25A1" },
        robots: [
            { id: "red", row: 0, col: 5 },
            { id: "blue", row: 12, col: 14 },
            { id: "green", row: 15, col: 1 },
            { id: "yellow", row: 4, col: 12 },
            { id: "black", row: 6, col: 10 }
        ]
    }
];
