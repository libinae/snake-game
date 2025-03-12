/**
 * 贪吃蛇游戏 - 带迷宫墙壁的增强版
 * 游戏特点：
 * 1. 动态迷宫生成
 * 2. 多食物系统
 * 3. 关卡进阶机制
 */

// 获取DOM元素
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-btn');

// 游戏基本配置
const gridSize = 20; // 网格大小，单位像素
const tileCount = canvas.width / gridSize; // 网格数量

// 游戏状态变量
let snake = [
    { x: 10, y: 10 } // 蛇的初始位置
];
let foods = [{ x: 15, y: 15 }]; // 食物数组
let walls = []; // 墙壁数组
let dx = 0; // 水平移动方向
let dy = 0; // 垂直移动方向
let score = 0; // 分数
let gameLoop; // 游戏循环计时器
let isGeneratingNewMaze = false; // 是否正在生成新迷宫的标志

/**
 * 游戏主循环函数
 * 负责清屏、移动蛇、检测碰撞、绘制游戏元素和更新分数
 */
function drawGame() {
    clearCanvas();
    moveSnake();
    checkCollision();
    drawWalls(); // 绘制墙壁
    drawFood();
    drawSnake();
    updateScore();
}

/**
 * 清空画布
 */
function clearCanvas() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * 绘制蛇
 * 使用绿色填充，每个蛇身体段略小于网格大小，形成网格间隙效果
 */
function drawSnake() {
    ctx.fillStyle = '#4CAF50';
    snake.forEach(segment => {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });
}

/**
 * 绘制食物
 * 使用红色填充，每个食物略小于网格大小
 */
function drawFood() {
    ctx.fillStyle = '#ff0000';
    foods.forEach(food => {
        ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
    });
}

/**
 * 绘制墙壁
 * 使用蓝色填充，墙壁填满整个网格
 */
function drawWalls() {
    ctx.fillStyle = '#3333cc';
    walls.forEach(wall => {
        ctx.fillRect(wall.x * gridSize, wall.y * gridSize, gridSize, gridSize);
    });
}

/**
 * 生成迷宫墙壁
 * 算法特点：
 * 1. 保留部分旧墙壁，增加新墙壁，保持游戏连续性
 * 2. 边界墙壁和内部墙壁分开生成，确保迷宫结构合理
 * 3. 确保墙壁不会太靠近蛇头，避免突然死亡
 */
function generateMaze() {
    const oldWalls = [...walls]; // 保存当前的墙壁
    const totalWallCount = oldWalls.length; // 记录当前墙壁总数
    walls = [];
    
    // 获取蛇头位置，用于确保墙壁不会太靠近蛇头
    const snakeHead = snake[0];
    
    // 如果有现有的墙壁，保留90%
    if (oldWalls.length > 0) {
        // 随机选择90%的墙壁保留
        const wallsToKeep = Math.floor(oldWalls.length * 0.9);
        // 随机打乱墙壁数组，确保随机性
        const shuffledWalls = oldWalls.sort(() => Math.random() - 0.5);
        walls = shuffledWalls.slice(0, wallsToKeep);
    }
    
    // 计算需要新生成的墙壁数量，确保总数保持相对稳定
    let wallsToGenerate = 0;
    if (totalWallCount > 0) {
        // 如果有现有墙壁，只需要生成10%的新墙壁
        wallsToGenerate = totalWallCount - walls.length;
    } else {
        // 如果是首次生成，则创建一个基本数量的墙壁
        // 边界墙壁数量估计(周长的20%) + 内部墙壁数量(面积的2%)
        wallsToGenerate = Math.floor(tileCount * 4 * 0.2) + Math.floor(tileCount * tileCount * 0.02);
    }
    
    // 首先尝试在边界生成一些墙壁
    let boundaryWallsAdded = 0;
    // 最多70%的新墙用于边界，确保内部也有足够的墙壁
    const maxBoundaryWalls = Math.min(wallsToGenerate, Math.floor(wallsToGenerate * 0.7)); 
    
    for (let i = 0; i < tileCount && boundaryWallsAdded < maxBoundaryWalls; i++) {
        // 上边界和下边界
        if (i < 3 || i > tileCount - 4) {
            continue; // 留出边缘空间，避免游戏开始就结束
        }
        
        // 在四个边界上定义潜在的墙壁位置
        const topWall = { x: i, y: 5 };
        const bottomWall = { x: i, y: tileCount - 6 };
        const leftWall = { x: 5, y: i };
        const rightWall = { x: tileCount - 6, y: i };
        
        // 计算每个潜在墙壁与蛇头的曼哈顿距离
        const distanceToTopWall = Math.abs(topWall.x - snakeHead.x) + Math.abs(topWall.y - snakeHead.y);
        const distanceToBottomWall = Math.abs(bottomWall.x - snakeHead.x) + Math.abs(bottomWall.y - snakeHead.y);
        const distanceToLeftWall = Math.abs(leftWall.x - snakeHead.x) + Math.abs(leftWall.y - snakeHead.y);
        const distanceToRightWall = Math.abs(rightWall.x - snakeHead.x) + Math.abs(rightWall.y - snakeHead.y);
        
        // 只有当墙与蛇头距离足够远时才添加，并且控制添加的数量
        // 10%的概率添加墙壁，确保墙壁分布均匀但不过密
        if (Math.random() < 0.1 && distanceToTopWall >= 3 && boundaryWallsAdded < maxBoundaryWalls) {
            walls.push(topWall);
            boundaryWallsAdded++;
        }
        
        if (Math.random() < 0.1 && distanceToBottomWall >= 3 && boundaryWallsAdded < maxBoundaryWalls) {
            walls.push(bottomWall);
            boundaryWallsAdded++;
        }
        
        if (Math.random() < 0.1 && distanceToLeftWall >= 3 && boundaryWallsAdded < maxBoundaryWalls) {
            walls.push(leftWall);
            boundaryWallsAdded++;
        }
        
        if (Math.random() < 0.1 && distanceToRightWall >= 3 && boundaryWallsAdded < maxBoundaryWalls) {
            walls.push(rightWall);
            boundaryWallsAdded++;
        }
    }
    
    // 生成剩余的内部随机墙壁
    const remainingWallsToGenerate = wallsToGenerate - boundaryWallsAdded;
    for (let i = 0; i < remainingWallsToGenerate; i++) {
        generateSingleWall();
    }
}

/**
 * 生成单个墙壁
 * 确保墙壁不会生成在蛇身上、食物上，或离蛇头太近
 * 同时确保墙壁之间有足够的空间，避免形成无法通过的区域
 */
function generateSingleWall() {
    // 在游戏区域中心区域生成墙壁，避开边缘5格
    const newWall = {
        x: Math.floor(Math.random() * (tileCount - 10)) + 5,
        y: Math.floor(Math.random() * (tileCount - 10)) + 5
    };
    
    // 获取蛇头位置
    const snakeHead = snake[0];
    // 计算与蛇头的曼哈顿距离
    const distanceToHead = Math.abs(newWall.x - snakeHead.x) + Math.abs(newWall.y - snakeHead.y);
    
    // 检查墙壁是否会与现有元素重叠或太靠近蛇头
    if (snake.some(segment => segment.x === newWall.x && segment.y === newWall.y) ||
        foods.some(food => food.x === newWall.x && food.y === newWall.y) ||
        walls.some(wall => wall.x === newWall.x && wall.y === newWall.y) ||
        distanceToHead < 3) { // 确保与蛇头至少保持3个格子的距离
        // 如果位置不合适，递归尝试生成新位置
        generateSingleWall();
        return;
    }
    
    // 检查墙壁周围是否有足够的空间，避免形成无法通过的区域
    let hasNearbyWall = false;
    for (let wall of walls) {
        const distance = Math.abs(wall.x - newWall.x) + Math.abs(wall.y - newWall.y);
        if (distance < 2) { // 如果有相邻的墙，不添加这个墙
            hasNearbyWall = true;
            break;
        }
    }
    
    // 只有当周围没有其他墙壁时，才添加这个新墙壁
    if (!hasNearbyWall) {
        walls.push(newWall);
    } else {
        // 如果位置不合适，递归尝试生成新位置
        generateSingleWall();
    }
}

/**
 * 移动蛇
 * 处理蛇的移动、食物的吃取和关卡进阶
 */
function moveSnake() {
    // 根据当前方向创建新的蛇头
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    // 将新蛇头添加到蛇身体的前端
    snake.unshift(head);
    
    // 检查是否吃到任何一个食物
    let foodEaten = false;
    for (let i = 0; i < foods.length; i++) {
        if (head.x === foods[i].x && head.y === foods[i].y) {
            score += 10; // 每吃一个食物得10分
            foods.splice(i, 1); // 移除被吃掉的食物
            foodEaten = true;
            break;
        }
    }
    
    // 关卡进阶：如果没有食物了，重新生成迷宫和食物
    if (foods.length === 0 && !isGeneratingNewMaze) {
        isGeneratingNewMaze = true;
        setTimeout(() => {
            generateMaze(); // 重新生成迷宫
            generateFood(); // 生成新的食物
            isGeneratingNewMaze = false;
        }, 1000); // 1秒的延迟，给玩家一个视觉提示
    }
    
    // 如果没有吃到食物，移除蛇尾，保持蛇长度不变
    if (!foodEaten) {
        snake.pop();
    }
    // 如果吃到食物，不移除蛇尾，蛇长度+1
}

/**
 * 生成食物
 * 随机生成1-3个食物，增加游戏的挑战性和策略性
 */
function generateFood() {
    // 清空现有食物数组
    foods = [];
    
    // 随机生成1-3个食物
    const foodCount = Math.floor(Math.random() * 3) + 1; // 1-3个食物
    
    // 为每个食物调用单独的生成函数
    for (let i = 0; i < foodCount; i++) {
        generateSingleFood();
    }
}

/**
 * 生成单个食物
 * 确保食物不会生成在蛇身上、其他食物上或墙壁上
 */
function generateSingleFood() {
    const newFood = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    
    // 确保食物不会生成在蛇身上、其他食物上或墙壁上
    if (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
        foods.some(food => food.x === newFood.x && food.y === newFood.y) ||
        walls.some(wall => wall.x === newFood.x && wall.y === newFood.y)) {
        generateSingleFood();
    } else {
        foods.push(newFood);
    }
}

/**
 * 检查碰撞
 * 检测蛇头是否碰到游戏边界、迷宫墙壁或自己的身体
 */
function checkCollision() {
    const head = snake[0];
    
    // 检查是否撞墙（游戏边界）
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
    }
    
    // 检查是否撞到迷宫墙壁
    if (walls.some(wall => wall.x === head.x && wall.y === head.y)) {
        gameOver();
    }
    
    // 检查是否撞到自己
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
        }
    }
}

/**
 * 更新分数显示
 * 将当前分数更新到页面上的分数元素中
 */
function updateScore() {
    scoreElement.textContent = `分数: ${score}`;
}

/**
 * 游戏结束处理
 * 停止游戏循环，显示最终分数和游戏结束界面
 */
function gameOver() {
    clearInterval(gameLoop);
    finalScoreElement.textContent = `最终分数: ${score}`;
    gameOverElement.style.display = 'block';
}

/**
 * 重置游戏
 * 将所有游戏状态恢复到初始值，隐藏游戏结束界面，重新生成迷宫和食物，启动游戏
 */
function resetGame() {
    snake = [{ x: 10, y: 10 }];
    foods = [];
    walls = [];
    dx = 0;
    dy = 0;
    score = 0;
    gameOverElement.style.display = 'none';
    generateMaze(); // 生成迷宫
    generateFood(); // 生成初始食物
    startGame();
}

/**
 * 处理键盘按键事件
 * 根据用户按下的方向键改变蛇的移动方向
 * 包含防止180度掉头的逻辑，避免蛇立即撞到自己
 * @param {KeyboardEvent} e - 键盘事件对象
 */
function handleKeyPress(e) {
    const key = e.key;
    
    // 检测R键重启游戏
    if (key === 'r' || key === 'R') {
        resetGame();
        return;
    }
    
    // 防止180度掉头
    if (key === 'ArrowUp' && dy !== 1) { // 不允许向上时向下掉头
        dx = 0;
        dy = -1;
    } else if (key === 'ArrowDown' && dy !== -1) { // 不允许向下时向上掉头
        dx = 0;
        dy = 1;
    } else if (key === 'ArrowLeft' && dx !== 1) { // 不允许向左时向右掉头
        dx = -1;
        dy = 0;
    } else if (key === 'ArrowRight' && dx !== -1) { // 不允许向右时向左掉头
        dx = 1;
        dy = 0;
    }
}

/**
 * 启动游戏
 * 清除可能存在的旧游戏循环，设置新的游戏循环定时器
 * 游戏速度为每200毫秒更新一次
 */
function startGame() {
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    gameLoop = setInterval(drawGame, 200);
}

// 设置事件监听器
document.addEventListener('keydown', handleKeyPress);
restartButton.addEventListener('click', resetGame);

// 初始化游戏
generateMaze(); // 首次生成迷宫
generateFood(); // 生成初始食物
startGame(); // 启动游戏循环