import pygame
import random
import sys
from typing import List, Tuple

# 初始化Pygame
pygame.init()

# 游戏常量
WINDOW_SIZE = 1200
GRID_SIZE = 40
TILE_COUNT = WINDOW_SIZE // GRID_SIZE

# 颜色定义
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (76, 175, 80)
RED = (255, 0, 0)
BLUE = (51, 51, 204)

# 游戏状态
class GameState:
    def __init__(self):
        self.screen = pygame.display.set_mode((WINDOW_SIZE, WINDOW_SIZE))
        pygame.display.set_caption('贪吃蛇游戏')
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont('SimHei', 36)  # 使用黑体显示中文
        self.restart_button = None  # 重启按钮区域
        self.pause_button = None  # 暂停按钮区域
        self.reset()

    def reset(self):
        self.snake = [(10, 10)]  # 蛇的初始位置
        self.foods = [(15, 15)]  # 食物位置
        self.walls = []  # 墙壁位置
        self.direction = (0, 0)  # 初始方向设为静止
        self.score = 0
        self.game_over = False
        self.is_paused = False  # 添加暂停状态标志
        self.is_generating_maze = False
        self.move_counter = 0  # 添加移动计数器
        self.move_delay = 15    # 每隔6帧移动一次蛇
        pygame.time.set_timer(pygame.USEREVENT, 0)  # 确保停止任何正在进行的计时器
        self.restart_button = None  # 重置重启按钮
        self.pause_button = None  # 重置暂停按钮
        self.generate_maze()
        self.generate_food()

    def generate_single_wall(self):
        # 在游戏区域中心区域生成墙壁，避开边缘5格
        new_wall = (
            random.randint(5, TILE_COUNT - 6),
            random.randint(5, TILE_COUNT - 6)
        )

        # 获取蛇头位置
        snake_head = self.snake[0]
        # 计算与蛇头的曼哈顿距离
        distance_to_head = abs(new_wall[0] - snake_head[0]) + abs(new_wall[1] - snake_head[1])

        # 检查墙壁是否会与现有元素重叠或太靠近蛇头
        if (new_wall in self.snake or
            new_wall in self.foods or
            new_wall in self.walls or
            distance_to_head < 3):  # 确保与蛇头至少保持3个格子的距离
            return self.generate_single_wall()

        # 检查墙壁周围是否有足够的空间
        for wall in self.walls:
            distance = abs(wall[0] - new_wall[0]) + abs(wall[1] - new_wall[1])
            if distance < 2:  # 如果有相邻的墙，不添加这个墙
                return self.generate_single_wall()

        return new_wall

    def generate_maze(self):
        old_walls = self.walls.copy()
        total_wall_count = len(old_walls)
        self.walls = []

        # 如果有现有的墙壁，保留90%
        if old_walls:
            walls_to_keep = int(len(old_walls) * 0.9)
            random.shuffle(old_walls)
            self.walls = old_walls[:walls_to_keep]

        # 计算需要新生成的墙壁数量
        if total_wall_count > 0:
            walls_to_generate = total_wall_count - len(self.walls)
        else:
            # 首次生成：边界墙壁(周长20%) + 内部墙壁(面积2%)
            walls_to_generate = int(TILE_COUNT * 4 * 0.2) + int(TILE_COUNT * TILE_COUNT * 0.02)

        # 生成新的墙壁
        for _ in range(walls_to_generate):
            new_wall = self.generate_single_wall()
            if new_wall:
                self.walls.append(new_wall)

    def generate_food(self):
        self.foods = []
        food_count = random.randint(1, 3)
        for _ in range(food_count):
            self.generate_single_food()

    def generate_single_food(self):
        while True:
            new_food = (
                random.randint(0, TILE_COUNT - 1),
                random.randint(0, TILE_COUNT - 1)
            )
            if (new_food not in self.snake and
                new_food not in self.foods and
                new_food not in self.walls):
                self.foods.append(new_food)
                break

    def move_snake(self):
        # 如果游戏暂停，不执行移动逻辑
        if self.is_paused:
            return
            
        # 增加计数器
        self.move_counter += 1
        
        # 只有当计数器达到延迟值时才移动蛇
        if self.move_counter < self.move_delay:
            return
            
        # 重置计数器
        self.move_counter = 0
        
        if self.direction == (0, 0) or self.game_over:
            return
        
        # 计算新的蛇头位置
        new_head = (
            self.snake[0][0] + self.direction[0],
            self.snake[0][1] + self.direction[1]
        )

        # 检查碰撞
        if (new_head[0] < 0 or new_head[0] >= TILE_COUNT or
            new_head[1] < 0 or new_head[1] >= TILE_COUNT or
            new_head in self.snake or
            new_head in self.walls):
            self.game_over = True
            return

        # 移动蛇
        self.snake.insert(0, new_head)

        # 检查是否吃到食物
        if new_head in self.foods:
            self.score += 10
            self.foods.remove(new_head)
            if not self.foods and not self.is_generating_maze:
                self.is_generating_maze = True
                pygame.time.set_timer(pygame.USEREVENT, 1000)  # 1秒后生成新迷宫
        else:
            self.snake.pop()
            
    def check_button_click(self, pos):
        """检查是否点击了重启或暂停按钮"""
        if self.game_over and self.restart_button and self.restart_button.collidepoint(pos):
            return "restart"
        elif not self.game_over and self.pause_button and self.pause_button.collidepoint(pos):
            return "pause"
        return None

    def draw(self):
        self.screen.fill(BLACK)

        # 绘制墙壁
        for wall in self.walls:
            pygame.draw.rect(self.screen, BLUE,
                           (wall[0] * GRID_SIZE, wall[1] * GRID_SIZE,
                            GRID_SIZE, GRID_SIZE))

        # 绘制食物
        for food in self.foods:
            pygame.draw.rect(self.screen, RED,
                           (food[0] * GRID_SIZE, food[1] * GRID_SIZE,
                            GRID_SIZE - 2, GRID_SIZE - 2))

        # 绘制蛇
        for segment in self.snake:
            pygame.draw.rect(self.screen, GREEN,
                           (segment[0] * GRID_SIZE, segment[1] * GRID_SIZE,
                            GRID_SIZE - 2, GRID_SIZE - 2))

        # 绘制分数
        score_text = self.font.render(f'分数: {self.score}', True, WHITE)
        self.screen.blit(score_text, (10, 10))

        # 绘制暂停按钮（仅在游戏未结束时显示）
        if not self.game_over:
            pause_text = self.font.render('暂停' if not self.is_paused else '继续', True, WHITE)
            button_width = pause_text.get_width() + 40
            button_height = pause_text.get_height() + 20
            button_x = WINDOW_SIZE - button_width - 10
            button_y = 10
            
            # 绘制按钮背景
            pygame.draw.rect(self.screen, GREEN if not self.is_paused else RED,
                           (button_x, button_y, button_width, button_height), 0, 10)
            
            # 绘制按钮文字
            self.screen.blit(pause_text,
                           (button_x + 20, button_y + 10))
            
            # 保存按钮区域用于检测点击
            self.pause_button = pygame.Rect(button_x, button_y, button_width, button_height)

        # 如果游戏结束，显示游戏结束信息
        if self.game_over:
            game_over_text = self.font.render('游戏结束!', True, WHITE)
            final_score_text = self.font.render(f'最终分数: {self.score}', True, WHITE)
            restart_text = self.font.render('重新开始', True, WHITE)

            text_x = WINDOW_SIZE // 2
            self.screen.blit(game_over_text,
                           (text_x - game_over_text.get_width() // 2, WINDOW_SIZE // 2 - 60))
            self.screen.blit(final_score_text,
                           (text_x - final_score_text.get_width() // 2, WINDOW_SIZE // 2))
            
            # 绘制重启按钮
            button_width = restart_text.get_width() + 40
            button_height = restart_text.get_height() + 20
            button_x = text_x - button_width // 2
            button_y = WINDOW_SIZE // 2 + 60
            
            # 绘制按钮背景
            pygame.draw.rect(self.screen, GREEN, 
                           (button_x, button_y, button_width, button_height), 0, 10)
            
            # 绘制按钮文字
            self.screen.blit(restart_text,
                           (text_x - restart_text.get_width() // 2, button_y + 10))
            
            # 保存按钮区域用于检测点击
            self.restart_button = pygame.Rect(button_x, button_y, button_width, button_height)

        pygame.display.flip()

def main():
    game = GameState()
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # 左键点击
                    button_action = game.check_button_click(event.pos)
                    if button_action == "restart":
                        game.reset()
                        continue
                    elif button_action == "pause":
                        game.is_paused = not game.is_paused
                        continue
            elif event.type == pygame.KEYDOWN:
                if not game.game_over:
                    if event.key == pygame.K_SPACE:
                        # 空格键也可以暂停/恢复游戏
                        game.is_paused = not game.is_paused
                    elif not game.is_paused:  # 只有在游戏未暂停时才处理方向键
                        if event.key == pygame.K_UP and game.direction[1] != 1:
                            game.direction = (0, -1)
                        elif event.key == pygame.K_DOWN and game.direction[1] != -1:
                            game.direction = (0, 1)
                        elif event.key == pygame.K_LEFT and game.direction[0] != 1:
                            game.direction = (-1, 0)
                        elif event.key == pygame.K_RIGHT and game.direction[0] != -1:
                            game.direction = (1, 0)
            elif event.type == pygame.USEREVENT and game.is_generating_maze:
                game.generate_maze()
                game.generate_food()
                game.is_generating_maze = False
                pygame.time.set_timer(pygame.USEREVENT, 0)  # 停止计时器

        game.move_snake()
        game.draw()
        game.clock.tick(60)  # 提高帧率到60，使方向改变更快响应

    pygame.quit()
    sys.exit()

if __name__ == '__main__':
    main()