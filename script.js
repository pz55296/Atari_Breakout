/*
Moguće je (nije obavezno) generirati zvuk prilikom kolizije loptice i cigle, loptice i palice, ili loptice i
gornjeg, lijevo i desnog ruba Canvasa. Također, moguće je generirati odgovarajuće zvuk na početku i
kraju igre, te kada igrač pređe neki okrugli broj bodova.
*/
const breakSound = new Audio("sounds/break.mp3");
const gameStartSound = new Audio("sounds/gameStart.mp3");
const gameOverSound = new Audio("sounds/gameOver.mp3");
const padleBounceSound = new Audio("sounds/padleTouch.mp3");
const wallBounceSound = new Audio("sounds/ballBounce.mp3");
const highScoreSound = new Audio("sounds/highScore.mp3");
const gameFinishedSound = new Audio("sounds/gameFinished.mp3");           

breakSound.volume = 1;
gameStartSound.volume = 1;
gameOverSound.volume = 1;
padleBounceSound.volume = 1;
wallBounceSound.volume = 1;
highScoreSound.volume = 1;
gameFinishedSound.volume = 1;

var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");
const x = c.width;
const y = c.height;
const yOffset = 20;
/*
Parametri igre broj cigli i početna brzina loptice su predefinirani i uvijek isti te moraju biti zapisani
kao simboličke konstante u vašem programskom kôdu.
*/
var padleSpeed = 15;
const colones = 10;
const rows = 5;

/*
Palica je položeni pravokutnik bijele ili svijetlo sive boje. Veličina palice ne smije biti manja od 25 x 10
piksela
*/
const padleWidth = 150;
const padleHeight = 10;

/*
Cigle su raznobojni položeni pravokutnici, a njihova veličina može biti po vašem izboru (npr. 30 x 10,
40 x 15, ili neka druga). Umjesto pravokutnika za prikaz cigli nije dozvoljeno koristiti slike (JPG, PNG),
već ih je potrebno iscrtavati u Canvas objektu. Međusobni vertikalni i horizontalni razmak te boje
cigli su precizno definirani, pogledati priloženu sliku.
*/
const blockDistanceX = 30, blockDistanceY = 15;
const blockWidth = (x - 11 * blockDistanceX) / 10;
const blockHeight = (y / 2 - 6 * blockDistanceY) / 5;
var padleX = x / 2 - padleWidth / 2;
var padleY = y - 20;
var posX = x / 2 - 5;
var posY = padleY - blockDistanceY;
/*
Loptica se na početku kreće konstantnom brzinom
*/
const startSpeeed = 5;
/*
Loptica se inicijalno generira na središtu palice i počinje se kretati slučajno lijevo-gore ili desno-gore
pod kutem od 45 stupnjeva
*/
var wayY = startSpeeed;
var wayX = Math.random() < 0.5 ? -startSpeeed : startSpeeed;
const ballWidth = 10;
const ballHeight = 10;
var blocksStatus = [];
var lastPosX;
var lastPosY;
var started = false;
const toleranceLevel = 3;
const speedChangeOnCornerHit = 1.1;
var score = 0;
var highScore;
var isBeatenHighScore = false;

/*
Najbolje ostvareni rezultat, od kad je igra prvi put pokrenuta, mora se pohranjivati koristeći local
storage pomoću HTML5 Web Storage API-ja.
*/
if (!localStorage.getItem("highScore")) {
    localStorage.setItem("highScore", 0);
}
highScore = localStorage.getItem("highScore");
for (let i = 0; i < 10; i++) {
    blocksStatus[i] = [];
    for (let j = 0; j < 5; j++) {
        blocksStatus[i][j] = 1;
    }
}
function startScreen() {
    /*Na sredini ekrana (vertikalno i horizontalno centrirano) ispisuje se riječ "BREAKOUT", bijele boje, bold, u Helvetica ili Verdana fontu veličine 36. */
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 36px Helvetica, Verdana";
    ctx.fillStyle = "white";
    ctx.fillText("BREAKOUT", x / 2, y / 2);

    /*Ispod riječi "BREAKOUT", na vertikalnoj udaljenosti 10 piksela riječi i Certirano horizontalno na sredini ekrana, ispisuje se "Press SPACE to begin", bijela boja, bold i italics, u Helvetica ili Verdana fontu veličine 18.*/
    ctx.font = "italic bold 18px Helvetica, Verdana";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText("Press SPACE to begin", x / 2, y / 2 + 36 / 2 + 10);
}
/*Korisnik mora pritisnuti razmaknicu (space) i igra započinje.*/
document.addEventListener("keydown", function (event) {
    if (event.code === "Space") {
        if (!started){
            gameStartSound.currentTime = 0;
            gameStartSound.play();
            startGame();
        }
        started = true;
    }
});

//postavlja se interval poziva gavne metode
function startGame() {
    document.addEventListener("keydown", playerControls);
    gameInterval = setInterval(updateGame, 20);
}

//glavna metoda igre
function updateGame() {
    ctx.clearRect(0, 0, x, y);
    setBlocks();
    updateScore();
    updateHighScore();
    setBallPosition();
    ballBlockCollision();
    checkCollisionWithPadle();
    ctx.save();
    setPadlePosition();
    updateBallPosition();
    
    if (score === colones * rows) {
        gameFinished();
    }
    ctx.restore();
}

/*Igrač upravlja palicom obavezno pomoću tipkovnice. Npr. tipke strelice - lijevo i desno, 'a' i 's', ili neke druge dvije tipke po vašem izboru.*/
function playerControls(event) {
    if (event.code === "ArrowLeft" || event.code === "KeyA") {
        padleX -= padleSpeed;
        if (padleX < 0) padleX = 0;
    }
    else if (event.code === "ArrowRight" || event.code === "KeyD") {
        padleX += padleSpeed;
        if (padleX > x - padleWidth)
            padleX = x - padleWidth;
    }
}

//postavlja se pozicija palice
function setPadlePosition() {
    /*
    Loptica i palica ne smiju biti slike (JPG, PNG), već se moraju iscrtavati u Canvas objektu. Isto kao cigle.
    */
    ctx.fillStyle = "#FFF0F0";
    ctx.shadowBlur = 15;
    ctx.strokeStyle = "#FF0000";
    ctx.fillRect(padleX, padleY, padleWidth, padleHeight);
}

/*
Na početku generira se 50 objekata "cigli" koje igrač treba razbiti pomoću loptice koja se odbija o
palicu koju igrač kontrolira na dnu ekrana. Cigle su razmještene u 5 redaka i 10 stupaca.
*/
function setBlocks() {
    for (let row = 0; row < rows; row++) {
        for (let colone = 0; colone < colones; colone++) {
            if (blocksStatus[colone][row] == 0) continue;
            let blockX = blockDistanceX + colone * (blockWidth + blockDistanceX);
            let blockY = blockDistanceY + row * (blockHeight + blockDistanceY) + yOffset;
            ctx.fillStyle = getBrickColor(row);
            /*
            Cigle, palica i loptica obavezno moraju imati sjenčanje ruba ("3D efekt") i biti prikazani korištenjem
            HTML5 Canvas API-a.
            */
            ctx.shadowColor = "#ffee00ff";
            ctx.shadowBlur = 15;
            ctx.fillRect(blockX, blockY, blockWidth, blockHeight);
        }
    }
}

/*
RGB vrijednosti boja cigli:
1. red (smeđe): 153, 51, 0
2. red (crveno): 255, 0, 0
3. red (ružičasto): 255, 153, 204
4. red (zeleno): 0, 255, 0
5. red (žuto): 255, 255, 153
*/
function getBrickColor(type) {
    switch (type) {
        case 0:
            return "rgb(153, 51, 0)";

        case 1:
            return "rgb(255, 0, 0)";

        case 2:
            return "rgb(255, 153, 204)";

        case 3:
            return "rgb(0, 255, 0)";

        case 4:
            return "rgb(255, 255, 153)";

        default:
            return "rgb(255, 255, 255)";
    }
}

/*
Loptica se prikazuje kao mali bijeli ili svijetlo sivi kvadrat
*/
/*
Loptica i palica ne smiju biti slike (JPG, PNG), već se moraju iscrtavati u Canvas objektu. Isto kao cigle.
*/
function setBallPosition() {
    ctx.fillStyle = "white";
    ctx.fillRect(posX, posY, ballWidth, ballHeight);
}

//updatea pozicije loptice
function updateBallPosition() {
    if (posX < 0){
        /*
        smjer mijenja prilikom udara o palicu, cigle ili rubove ekrana
        */
        wayX = -wayX;
        wallBounceSound.currentTime = 0;
        wallBounceSound.play();
    }
    else if ((posX + ballWidth) >= x){
        /*
        smjer mijenja prilikom udara o palicu, cigle ili rubove ekrana
        */
        wayX = -wayX;
        wallBounceSound.currentTime = 0;
        wallBounceSound.play();
    }
    if (posY < 0){
        /*
        smjer mijenja prilikom udara o palicu, cigle ili rubove ekrana
        */
        wayY = -wayY;
        wallBounceSound.currentTime = 0;
        wallBounceSound.play();
    }
    else if ((posY + ballHeight) >= y){
        wayX = 0;
        wayY = 0;
        ctx.shadowBlur = 0;
        gameOver();
    }
    lastPosX = posX;
    lastPosY = posY;
    posX += wayX;
    posY -= wayY;
}

//provjera sudara loptice s ciglama
function ballBlockCollision() {
    for (let row = 0; row < rows; row++) {
        for (let colone = 0; colone < colones; colone++) {
            if (blocksStatus[colone][row] === 1) {
                checkCollisionWithBlock(colone, row);
            }
        }
    }
}

//provjera sudara loptice s ciglom
function checkCollisionWithBlock(colone, row) {
    let blockX = blockDistanceX + colone * (blockWidth + blockDistanceX);
    let blockY = blockDistanceY + row * (blockHeight + blockDistanceY) + yOffset;
    if (
        posX < blockX + blockWidth &&
        posX + ballWidth > blockX &&
        posY < blockY + blockHeight &&
        posY + ballHeight > blockY
    ) {
        if (isCornerHit(blockX, blockY, toleranceLevel)) {
            /*
            Brzina loptice se
            mijenja ako loptica udara u kut cigle
            */
            wayX = -wayX * speedChangeOnCornerHit;
            wayY = -wayY * speedChangeOnCornerHit;
        }
        else {
            /*
            smjer mijenja prilikom udara o palicu, cigle ili rubove ekrana
            */
            changeRoute(blockX, blockY, blockWidth, blockHeight);
        }
        updateBlocksState(row, colone);
    }
}

//provjera sudara loptice s palicom
function checkCollisionWithPadle() {
    if (
        posX < padleX + padleWidth &&
        posX + ballWidth > padleX &&
        posY < padleY + padleHeight &&
        posY + ballHeight > padleY
    ) {
        padleBounceSound.currentTime = 0;
        padleBounceSound.play();
        /*
        smjer mijenja prilikom udara o palicu, cigle ili rubove ekrana
        */
        changeRoute(padleX, padleY, padleWidth, padleHeight);
    }
}

//mijenja smjer kretanja loptice
function changeRoute(elementX, elementY, elementWidth, elementHeight) {
    //donji desni kut lopte     -   liva strana bloka
    if (checkLineCrossing(posX + ballWidth, posY + ballHeight, lastPosX + ballWidth, lastPosY + ballHeight, elementX, elementY, elementX, elementY + elementHeight))
        wayX = -wayX;
    //donji desni kut lopte     -   gornja strana bloka
    else if (checkLineCrossing(posX + ballWidth, posY + ballHeight, lastPosX + ballWidth, lastPosY + ballHeight, elementX, elementY, elementX + elementWidth, elementY))
        wayY = -wayY;

    //donji livi kut lopte     -   desna strana bloka
    else if (checkLineCrossing(posX, posY + ballHeight, lastPosX, lastPosY + ballHeight, elementX + elementWidth, elementY, elementX + elementWidth, elementY + elementHeight))
        wayX = -wayX;
    //donji livi kut lopte     -   gornja strana bloka
    else if (checkLineCrossing(posX, posY + ballHeight, lastPosX, lastPosY + ballHeight, elementX + elementWidth, elementY, elementX, elementY))
        wayY = -wayY;

    //gornji desni kut lopte     -   donja strana bloka
    else if (checkLineCrossing(posX + ballWidth, posY, lastPosX + ballWidth, lastPosY, elementX, elementY + elementHeight, elementX + elementWidth, elementY + elementHeight))
        wayY = -wayY;
    //gornji desni kut lopte     -   liva strana bloka
    else if (checkLineCrossing(posX + ballWidth, posY, lastPosX + ballWidth, lastPosY, elementX, elementY + elementHeight, elementX, elementY))
        wayX = -wayX;

    //gornji livi kut lopte     -    donja strana bloka
    else if (checkLineCrossing(posX, posY, lastPosX, lastPosY, elementX, elementY + elementHeight, elementX + elementWidth, elementY + elementHeight))
        wayY = -wayY;
    //gornji livi kut lopte     -   desna strana bloka
    else if (checkLineCrossing(posX, posY, lastPosX, lastPosY, elementX + elementWidth, elementY, elementX + elementWidth, elementY + elementHeight))
        wayX = -wayX;
}

//provjera udara loptice u kut cigle
function isCornerHit(blockX, blockY, tolerance) {
    const dirX = posX - lastPosX;
    const dirY = posY - lastPosY;

    const leftCrossLine = Math.abs(posX + ballWidth - blockX);
    const rightCrossLine = Math.abs(posX - (blockX + blockWidth));
    const topCrossLine = Math.abs(posY + ballHeight - blockY);
    const bottomCrossLine = Math.abs(posY - (blockY + blockHeight));
    // dole-desno
    if (dirX > 0 && dirY > 0) {
        return (leftCrossLine <= tolerance && topCrossLine <= tolerance);
    }
    // dole-livo
    else if (dirX < 0 && dirY > 0) {
        return (rightCrossLine <= tolerance && topCrossLine <= tolerance);
    }
    // gore-desno
    else if (dirX > 0 && dirY < 0) {
        return (leftCrossLine <= tolerance && bottomCrossLine <= tolerance);
    }
    // gore-livo
    else if (dirX < 0 && dirY < 0) {
        return (rightCrossLine <= tolerance && bottomCrossLine <= tolerance);
    }

    return false;
}

//updatea stanje cigle nakon sudara s lopticom
function updateBlocksState(row, colone) {
    blocksStatus[colone][row] = 0;
        breakSound.currentTime = 0;
        breakSound.play();    
        /*
        U svakom koraku animacije mora se detektirati kolizija (sudar) loptice s ciglama, palicom i rubovima
        ekrana. Nakon svakog sudara s ciglom, cigla nestaje, a igrač dobiva bodove (1 uništena cigla = 1 bod).
        */ 
    score += 1;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
        saveHighScore();
        if (!isBeatenHighScore) {
            highScoreSound.currentTime = 0;
            highScoreSound.play();
            isBeatenHighScore = true;
        }
    }
}

//provjera presijecanja dviju linija(linije kretanja loptice i rubovi cigle/palice)
function checkLineCrossing(x1, y1, x2, y2, x3, y3, x4, y4) {
    let denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) return false;

    let t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    let u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    return (t >= 0 && t <= 1 && u >= 0 && u <= 1);
}
/*
Ako loptica izađe izvan donjeg ruba ekrana, igra završava, te se obavezno preko sredine Canvasa (vertikalno i horizontalno centrirano) prikazuje tekstualna obavijest "GAME OVER", u žutoj boji, bold, Helvetica ili Verdana font veličine 40.
*/
function gameOver() {
    breakSound.volume = 0;
    gameStartSound.volume = 0;
    padleBounceSound.volume = 0;
    wallBounceSound.volume = 0;
    highScoreSound.volume = 0;
    clearInterval(gameInterval);
    gameOverSound.currentTime = 0;
    gameOverSound.play();
    ctx.clearRect(0, 0, x, y);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 40px Helvetica, Verdana";
    ctx.fillStyle = "yellow";
    ctx.fillText("GAME OVER", x / 2, y / 2);
}
/*
Ako je igrač dovoljno vješt i uspije uništiti sve cigle, igra završava uz obavezni ispis prikladne poruke
na isti način.
*/
function gameFinished() {
    breakSound.volume = 0;
    gameStartSound.volume = 0;
    padleBounceSound.volume = 0;
    wallBounceSound.volume = 0;
    highScoreSound.volume = 0;
    clearInterval(gameInterval);
    gameFinishedSound.currentTime = 0;
    gameFinishedSound.play();
    ctx.clearRect(0, 0, x, y);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 40px Helvetica, Verdana";
    ctx.fillStyle = "green";
    ctx.shadowBlur = 0;
    ctx.fillText("CONGRATULATIONS", x / 2, y / 2);
}
/*
U gornjem lijevom desnom rubu Canvasa mora se prikazivati trenutni broj bodova, a u gornjem
desnom kutu maksimalni broj bodova. Mjesto prikaza trenutnog i maksimalno broja bodova je
strogo definiran - pogledati priloženu sliku.
*/
function updateScore() {
    ctx.font = "20px Helvetica, Verdana";
    ctx.textAlign = "left";
    ctx.fillStyle = "white";
    ctx.shadowBlur = 0;
    ctx.fillText(`${score}`, 20, 20);
    ctx.shadowBlur = 15;
}
//metoda za update high score
function updateHighScore() {
    ctx.font = "20px Helvetica, Verdana";
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.shadowBlur = 0;
    ctx.fillText(`${highScore}`, x - 20, 20);
    ctx.shadowBlur = 15;
}
//metoda za spremanje high score u local storage
function saveHighScore() {
    localStorage.setItem("highScore", highScore);
}