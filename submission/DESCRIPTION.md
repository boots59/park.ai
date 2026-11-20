# Park.AI: project description (paste into the submission form)

**One line:** Park.AI tells KSU drivers which part of West Deck has open spaces before they drive in, and a phone camera does the counting.

**The problem.** I polled 54 drivers at West Deck. 49 said parking has made them late to class this semester, and 31 had tried more than one level or lot that day. When I counted the deck at 11:50 AM on a Thursday it was not full: 70 student spaces were open, but 57 of them were in 3 of the 10 bays, and nothing tells a driver which. Level 1 has 181 stalls and none are for students.

**Who it is for.** Commuter students arriving at West Deck (Kennesaw campus) between 9 AM and 1 PM, and the parking monitors who already walk that deck.

**What it does.**
1. A parking monitor points a phone at a row of cars. An AI model on the phone counts the vehicles; the monitor checks the number and saves it.
2. A driver opens the app and sees whether the deck has room and which bay to try first, on a 3D model of the deck with the entrances and the exit to campus marked.
3. A student who just parked adds one anonymous tap ("plenty", "a few", "full") for the next driver.

Every number shows how old it is. An old count is kept and labelled, never shown as live.

**Where the AI is.** A vehicle-detection model runs on the phone and counts cars in the camera view; nothing is recorded or uploaded. A statistical model estimates each bay between counts and ranks where to try first.

**What is real.** 662 stalls counted on foot; two full counts of the deck; 54 drivers polled (30 in person, 24 by QR code); 9 students tried the app (7 found it easy, 7 would check it before driving in); a meeting with KSU parking operations. One deck, one day, one counter. Not a KSU system; nothing is agreed with KSU.

**Try it:** https://boots59.github.io/park.ai/ · **Code:** https://github.com/boots59/park.ai
