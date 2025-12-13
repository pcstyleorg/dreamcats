# **Game Specification: Dreamcats**

Inspired by classic memory card games.

## **1\. Game Overview & Objective**

- **Theme:** Players travel to a dream world. Some lands are fairytales, others are dark nightmares full of cats.
- **Goal:** Create a "Dream" (4 cards) with the lowest possible value (fewest cats).
- **Players:** 2 to 5 players.
- **Winning Condition:** The game ends when a player reaches 100 points. The player with the _lowest_ score wins.

## **2\. Components & Card Distribution (54 Cards Total)**

The deck consists of "Lands" with values representing the number of cats.

| Card Value/Name            | Count    | Description / Notes                                     |
| :------------------------- | :------- | :------------------------------------------------------ |
| **0 \- 8**                 | 4 each   | Standard number cards. (9 types × 4 copies \= 36 cards) |
| **9**                      | 9 copies | High value "Cat" cards. Common bad cards.               |
| **Special: "Weź 2"**       | 3 copies | "Take 2" \- Draw 2 cards from deck.                     |
| **Special: "Podejrzyj 1"** | 3 copies | "Peek 1" \- Look at one card.                           |
| **Special: "Zamień 2"**    | 3 copies | "Swap 2" \- Swap two cards.                             |

**Total:** 36 (0-8) \+ 9 (9s) \+ 9 (Specials) \= 54 cards.

## **3\. Game Setup**

1. **The Dream:** Each player is dealt **4 cards face-down**.
2. **Initial Peek:** Players may look at **exactly 2** of their own face-down cards to memorize them. They cannot look at the other 2\.
3. **Draw Piles:**
   - **Stos Zakryty (Draw Pile):** Remaining cards face-down in the center.
   - **Stos Odkryty (Discard Pile):** Top card of the draw pile is flipped to start this pile.

## **4\. Gameplay Loop (Turn Logic)**

The player with the "strangest dream last night" (or oldest) starts. Play moves clockwise.

### **On a Player's Turn:**

The player must perform **ONE** of two main actions (A or B):

#### **Action A: Draw from Discard Pile (Stos Odkryty)**

1. Take the top visible card from the Discard Pile.
2. **Mandatory Swap:** Exchange it with _one_ of the 4 cards in your own Dream (face-down).
3. The replaced card is placed face-up on the Discard Pile.

#### **Action B: Draw from Draw Pile (Stos Zakryty)**

1. Draw the top hidden card.
2. The player looks at it (privately) and chooses one option:
   - **B1: Swap:** Swap it with one of their own face-down cards. Discard the old card.
   - **B2: Discard:** Place the drawn card on the Discard Pile (if they don't want it).
   - **B3: Use Special Power:** If the card is a **Special Card**, they may discard it immediately to activate its effect (see Section 5).

## **5\. Special Cards (Krainy Specjalne)**

Special powers can **ONLY** be activated if the card was drawn from the **Draw Pile** (Hidden) and immediately discarded. If a special card is picked up from the Discard Pile, it acts as a normal number card (usually value is irrelevant/treated as number, but typically these have high values like 5, 6, 7 in corner).

- **Weź 2 (Take 2):**
  - Draw 2 cards from the Draw Pile.
  - Look at them. Choose **one** to keep.
  - Discard the other one.
  - With the kept card, perform a normal action (Swap it into your dream OR Discard it OR Use it if it's another special card).
- **Podejrzyj 1 (Peek 1):**
  - Look at **one** card in **any** player's dream (your own or an opponent's).
  - Return it to its place face-down.
- **Zamień 2 (Swap 2):**
  - Swap the positions of **any two** cards on the table.
  - Combinations: Own Card ↔ Own Card, Own ↔ Opponent, Opponent A ↔ Opponent B.
  - **Constraint:** You **cannot** look at the cards being swapped.

## **6\. End of Round: "POBUDKA\!" (Wake Up)**

A round ends when a player believes they have the lowest score.

1. **Trigger:** At the _start_ of their turn (instead of drawing), a player calls **"POBUDKA\!"**.
2. **Immediate End:** The round ends. No more turns are played.
3. **Reveal:** All players flip their 4 cards face-up.
4. **Scoring Logic:**
   - Sum the values of the 4 cards.
   - **The Caller's Risk:**
     - If the Caller has the **strictly lowest** score (or ties for lowest): They score their sum (0 penalty).
     - If the Caller does **NOT** have the lowest score: They score their sum **plus 5 penalty points**.
   - Other players just score their sum.

## **7\. Game End Condition**

- Scores are recorded after every round.
- The game ends when a player's total score reaches or exceeds **100**.
- **Winner:** The player with the lowest total score.

## **8\. Visual & Aesthetic Notes**

- **Style:** Dreamy, surreal, slightly dark but whimsical.
- **Motifs:** Cats, Frogs, Cherry Blossom Trees, Lanterns, Pagodas.
- **Back of Cards:** Delicate cherry blossom branches with small silhouettes of cats (dreamy spring aesthetic).
- **UI Layout:**
  - Player zones (Bottom \= Human, Top/Sides \= AI/Opponents).
  - Opponent cards always face-down.
  - Clearly distinct piles in the center.

## **9\. Terminology (Polish \-\> English mapping)**

- _Marzenie_ \-\> Dream (The player's hand)
- _Kruki_ \-\> Cats (Points/Bad values)
- _Stos Zakryty_ \-\> Draw Pile (Hidden)
- _Stos Odkryty_ \-\> Discard Pile (Visible)
- _Pobudka_ \-\> Wake Up (End round call)

## **10\. Feel and Vibe**

- **Atmosphere:** Soft, surreal, and slightly tense—between dream and wakefulness.
- **Look & Color:** Pastel cherry blossoms and lantern glow against deep twilight blues and purples, with watercolor and ink-wash inspired art.
- **Emotion:** Whimsical melancholy—cats as quiet anxiety, frogs and blossoms as gentle comfort.
- **Audio (if digital):** Sparse koto, chimes, and distant bells for a calm, mysterious soundscape.
