#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Minecraft 主題測驗遊戲 v2.0
完整的 RPG 式學習遊戲，包含金幣、體力、商店和存檔系統
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import json
import random
import os
from datetime import datetime

class GameSave:
    """遊戲存檔類別"""
    def __init__(self, slot_id):
        self.slot_id = slot_id
        self.save_file = f"save_slot_{slot_id}.json"

    def save(self, game_data):
        """儲存遊戲資料"""
        game_data['last_save'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(self.save_file, 'w', encoding='utf-8') as f:
                json.dump(game_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"儲存失敗：{e}")
            return False

    def load(self):
        """載入遊戲資料"""
        if os.path.exists(self.save_file):
            try:
                with open(self.save_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return None
        return None

    def exists(self):
        """檢查存檔是否存在"""
        return os.path.exists(self.save_file)


class StartScreen:
    """開始畫面"""
    def __init__(self, root, on_start_game):
        self.root = root
        self.on_start_game = on_start_game
        self.colors = {
            'bg': '#2C2C2C',
            'grass': '#5FAD41',
            'dirt': '#8B6F47',
            'stone': '#7F7F7F',
            'gold': '#FFD700',
            'diamond': '#5DADE2',
            'redstone': '#DC143C',
            'text': '#FFFFFF'
        }

        self.create_widgets()

    def create_widgets(self):
        """建立開始畫面"""
        # 主框架
        main_frame = tk.Frame(self.root, bg=self.colors['bg'])
        main_frame.pack(fill=tk.BOTH, expand=True)

        # 標題
        title_frame = tk.Frame(main_frame, bg=self.colors['grass'], height=120)
        title_frame.pack(fill=tk.X, padx=20, pady=20)
        title_frame.pack_propagate(False)

        title = tk.Label(
            title_frame,
            text="⛏️ Minecraft 測驗遊戲 ⛏️",
            font=("Arial", 32, "bold"),
            bg=self.colors['grass'],
            fg=self.colors['text']
        )
        title.pack(expand=True)

        subtitle = tk.Label(
            title_frame,
            text="學習即挖礦，知識即財富！",
            font=("Arial", 14),
            bg=self.colors['grass'],
            fg=self.colors['gold']
        )
        subtitle.pack()

        # 存檔選擇區域
        slots_frame = tk.Frame(main_frame, bg=self.colors['bg'])
        slots_frame.pack(pady=30)

        tk.Label(
            slots_frame,
            text="🎮 選擇存檔槽位",
            font=("Arial", 18, "bold"),
            bg=self.colors['bg'],
            fg=self.colors['gold']
        ).pack(pady=10)

        # 三個存檔槽
        for i in range(1, 4):
            self.create_save_slot(slots_frame, i)

    def create_save_slot(self, parent, slot_id):
        """建立存檔槽位按鈕"""
        save = GameSave(slot_id)
        save_data = save.load()

        slot_frame = tk.Frame(parent, bg=self.colors['stone'], relief=tk.RAISED, bd=3)
        slot_frame.pack(pady=10, padx=20, fill=tk.X)

        # 存檔資訊
        info_frame = tk.Frame(slot_frame, bg=self.colors['stone'])
        info_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=10)

        if save_data:
            # 有存檔
            tk.Label(
                info_frame,
                text=f"📁 存檔 {slot_id}",
                font=("Arial", 14, "bold"),
                bg=self.colors['stone'],
                fg=self.colors['gold']
            ).pack(anchor=tk.W)

            tk.Label(
                info_frame,
                text=f"💰 金幣: {save_data.get('coins', 0)} | ❤️ 體力: {save_data.get('health', 100)} | 📚 題目: {len(save_data.get('questions', []))}",
                font=("Arial", 11),
                bg=self.colors['stone'],
                fg=self.colors['text']
            ).pack(anchor=tk.W)

            tk.Label(
                info_frame,
                text=f"⏰ 最後遊玩: {save_data.get('last_save', '未知')}",
                font=("Arial", 9),
                bg=self.colors['stone'],
                fg=self.colors['diamond']
            ).pack(anchor=tk.W)

            btn_text = "▶️ 繼續遊戲"
            btn_color = self.colors['grass']
        else:
            # 空存檔
            tk.Label(
                info_frame,
                text=f"📁 存檔 {slot_id}",
                font=("Arial", 14, "bold"),
                bg=self.colors['stone'],
                fg=self.colors['gold']
            ).pack(anchor=tk.W)

            tk.Label(
                info_frame,
                text="空存檔槽位",
                font=("Arial", 11),
                bg=self.colors['stone'],
                fg=self.colors['text']
            ).pack(anchor=tk.W)

            btn_text = "🆕 新遊戲"
            btn_color = self.colors['diamond']

        # 按鈕框架
        btn_frame = tk.Frame(slot_frame, bg=self.colors['stone'])
        btn_frame.pack(side=tk.RIGHT, padx=10, pady=10)

        # 開始/繼續按鈕
        start_btn = tk.Button(
            btn_frame,
            text=btn_text,
            font=("Arial", 12, "bold"),
            bg=btn_color,
            fg=self.colors['text'],
            command=lambda: self.start_game(slot_id),
            cursor="hand2",
            relief=tk.RAISED,
            bd=3,
            padx=20,
            pady=10
        )
        start_btn.pack()

        # 刪除存檔按鈕（只在有存檔時顯示）
        if save_data:
            delete_btn = tk.Button(
                btn_frame,
                text="🗑️",
                font=("Arial", 10),
                bg=self.colors['redstone'],
                fg=self.colors['text'],
                command=lambda: self.delete_save(slot_id),
                cursor="hand2",
                relief=tk.RAISED,
                bd=2,
                padx=10,
                pady=5
            )
            delete_btn.pack(pady=(5, 0))

    def start_game(self, slot_id):
        """開始遊戲"""
        self.on_start_game(slot_id)

    def delete_save(self, slot_id):
        """刪除存檔"""
        if messagebox.askyesno("確認刪除", f"確定要刪除存檔 {slot_id} 嗎？\n此操作無法復原！"):
            save = GameSave(slot_id)
            try:
                if os.path.exists(save.save_file):
                    os.remove(save.save_file)
                messagebox.showinfo("完成", "存檔已刪除！")
                # 重新整理畫面
                for widget in self.root.winfo_children():
                    widget.destroy()
                self.create_widgets()
            except Exception as e:
                messagebox.showerror("錯誤", f"刪除失敗：{str(e)}")


class MinecraftQuizGame:
    """Minecraft 測驗遊戲主程式"""
    def __init__(self, root, slot_id):
        self.root = root
        self.slot_id = slot_id
        self.save_manager = GameSave(slot_id)

        # Minecraft 配色
        self.colors = {
            'bg': '#2C2C2C',
            'grass': '#5FAD41',
            'dirt': '#8B6F47',
            'stone': '#7F7F7F',
            'gold': '#FFD700',
            'diamond': '#5DADE2',
            'redstone': '#DC143C',
            'emerald': '#50C878',
            'text': '#FFFFFF',
            'btn_bg': '#4A4A4A',
            'btn_hover': '#6A6A6A',
            'health': '#FF5555'
        }

        # 載入或初始化遊戲資料
        self.load_game_data()

        # 道具資料
        self.items = {
            'health_potion': {'name': '❤️ 生命藥水', 'price': 50, 'effect': 'heal', 'value': 20},
            'skip_ticket': {'name': '⏭️ 跳過券', 'price': 30, 'effect': 'skip', 'value': 1},
            'double_coins': {'name': '💰 雙倍金幣', 'price': 100, 'effect': 'double', 'value': 5}
        }

        # 建立遊戲界面
        self.create_game_ui()

        # 自動儲存計時器（每30秒自動儲存）
        self.auto_save_timer()

    def load_game_data(self):
        """載入遊戲資料"""
        save_data = self.save_manager.load()

        if save_data:
            # 載入存檔
            self.questions = save_data.get('questions', [])
            self.health = save_data.get('health', 100)
            self.coins = save_data.get('coins', 0)
            self.score = save_data.get('score', 0)
            self.total_answered = save_data.get('total_answered', 0)
            self.inventory = save_data.get('inventory', {
                'health_potion': 0,
                'skip_ticket': 0,
                'double_coins': 0
            })
            self.double_coins_remaining = save_data.get('double_coins_remaining', 0)
        else:
            # 新遊戲
            self.questions = []
            self.health = 100
            self.coins = 0
            self.score = 0
            self.total_answered = 0
            self.inventory = {
                'health_potion': 0,
                'skip_ticket': 0,
                'double_coins': 0
            }
            self.double_coins_remaining = 0

        self.current_question_index = -1
        self.question_range = (0, 0)
        self.max_health = 100

    def save_game_data(self):
        """儲存遊戲資料"""
        game_data = {
            'questions': self.questions,
            'health': self.health,
            'coins': self.coins,
            'score': self.score,
            'total_answered': self.total_answered,
            'inventory': self.inventory,
            'double_coins_remaining': self.double_coins_remaining
        }
        return self.save_manager.save(game_data)

    def auto_save_timer(self):
        """自動儲存計時器"""
        self.save_game_data()
        # 每30秒自動儲存
        self.root.after(30000, self.auto_save_timer)

    def create_game_ui(self):
        """建立遊戲界面"""
        # 清空畫面
        for widget in self.root.winfo_children():
            widget.destroy()

        # 標題列
        self.create_header()

        # 主要內容區域
        main_frame = tk.Frame(self.root, bg=self.colors['bg'])
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # 左側控制面板
        self.create_control_panel(main_frame)

        # 右側遊戲區域
        self.create_game_area(main_frame)

    def create_header(self):
        """建立標題列"""
        header_frame = tk.Frame(self.root, bg=self.colors['grass'], height=100)
        header_frame.pack(fill=tk.X, padx=10, pady=10)
        header_frame.pack_propagate(False)

        # 左側標題
        title_container = tk.Frame(header_frame, bg=self.colors['grass'])
        title_container.pack(side=tk.LEFT, padx=10)

        tk.Label(
            title_container,
            text="⛏️ Minecraft 測驗遊戲 ⛏️",
            font=("Arial", 20, "bold"),
            bg=self.colors['grass'],
            fg=self.colors['text']
        ).pack()

        tk.Label(
            title_container,
            text=f"存檔槽位: {self.slot_id}",
            font=("Arial", 10),
            bg=self.colors['grass'],
            fg=self.colors['gold']
        ).pack()

        # 右側狀態列
        status_container = tk.Frame(header_frame, bg=self.colors['grass'])
        status_container.pack(side=tk.RIGHT, padx=10)

        # 金幣顯示
        coin_frame = tk.Frame(status_container, bg=self.colors['gold'], relief=tk.RAISED, bd=3)
        coin_frame.pack(side=tk.TOP, pady=2)

        self.coin_label = tk.Label(
            coin_frame,
            text=f"💰 {self.coins}",
            font=("Arial", 16, "bold"),
            bg=self.colors['gold'],
            fg=self.colors['bg'],
            padx=15,
            pady=5
        )
        self.coin_label.pack()

        # 體力條
        health_frame = tk.Frame(status_container, bg=self.colors['stone'], relief=tk.RAISED, bd=3)
        health_frame.pack(side=tk.TOP, pady=2)

        self.health_label = tk.Label(
            health_frame,
            text=f"❤️ {self.health}/{self.max_health}",
            font=("Arial", 14, "bold"),
            bg=self.colors['stone'],
            fg=self.colors['health'],
            padx=15,
            pady=5
        )
        self.health_label.pack()

        # 分數顯示
        score_frame = tk.Frame(status_container, bg=self.colors['diamond'], relief=tk.RAISED, bd=3)
        score_frame.pack(side=tk.TOP, pady=2)

        self.score_display = tk.Label(
            score_frame,
            text=f"💎 {self.score}/{self.total_answered}",
            font=("Arial", 14, "bold"),
            bg=self.colors['diamond'],
            fg=self.colors['bg'],
            padx=15,
            pady=5
        )
        self.score_display.pack()

    def create_control_panel(self, parent):
        """建立控制面板"""
        control_frame = tk.Frame(parent, bg=self.colors['stone'], width=280)
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        control_frame.pack_propagate(False)

        # 控制面板標題
        tk.Label(
            control_frame,
            text="📚 控制面板",
            font=("Arial", 14, "bold"),
            bg=self.colors['stone'],
            fg=self.colors['gold']
        ).pack(pady=10)

        # 題庫管理
        self.create_button(
            control_frame,
            "📤 上傳題目檔案",
            self.upload_questions,
            self.colors['dirt']
        ).pack(pady=5, padx=10, fill=tk.X)

        self.create_button(
            control_frame,
            "✏️ 智能輸入題目",
            self.smart_input_questions,
            self.colors['emerald']
        ).pack(pady=5, padx=10, fill=tk.X)

        self.create_button(
            control_frame,
            "📋 檢視所有題目",
            self.view_all_questions,
            self.colors['dirt']
        ).pack(pady=5, padx=10, fill=tk.X)

        # 題目範圍
        range_frame = tk.LabelFrame(
            control_frame,
            text="出題範圍",
            bg=self.colors['stone'],
            fg=self.colors['text'],
            font=("Arial", 10, "bold")
        )
        range_frame.pack(pady=10, padx=10, fill=tk.X)

        tk.Label(
            range_frame,
            text="從第",
            bg=self.colors['stone'],
            fg=self.colors['text']
        ).grid(row=0, column=0, padx=5, pady=5)

        self.start_entry = tk.Entry(range_frame, width=5)
        self.start_entry.grid(row=0, column=1, padx=5, pady=5)
        self.start_entry.insert(0, "1")

        tk.Label(
            range_frame,
            text="題到第",
            bg=self.colors['stone'],
            fg=self.colors['text']
        ).grid(row=0, column=2, padx=5, pady=5)

        self.end_entry = tk.Entry(range_frame, width=5)
        self.end_entry.grid(row=0, column=3, padx=5, pady=5)

        # 開始測驗按鈕
        self.create_button(
            control_frame,
            "🎯 開始測驗！",
            self.start_quiz,
            self.colors['diamond'],
            font_size=12
        ).pack(pady=15, padx=10, fill=tk.X)

        # 商店按鈕
        self.create_button(
            control_frame,
            "🏪 開啟商店",
            self.open_shop,
            self.colors['gold'],
            font_size=12
        ).pack(pady=5, padx=10, fill=tk.X)

        # 背包按鈕
        self.create_button(
            control_frame,
            "🎒 背包道具",
            self.open_inventory,
            self.colors['emerald'],
            font_size=12
        ).pack(pady=5, padx=10, fill=tk.X)

        # 題庫狀態
        self.question_count_label = tk.Label(
            control_frame,
            text=f"📚 題庫: {len(self.questions)} 題",
            font=("Arial", 11),
            bg=self.colors['stone'],
            fg=self.colors['text']
        )
        self.question_count_label.pack(pady=10)

        # 儲存遊戲按鈕
        self.create_button(
            control_frame,
            "💾 手動存檔",
            self.manual_save,
            self.colors['grass']
        ).pack(pady=5, padx=10, fill=tk.X, side=tk.BOTTOM)

        # 返回主選單按鈕
        self.create_button(
            control_frame,
            "🏠 返回主選單",
            self.return_to_menu,
            self.colors['redstone']
        ).pack(pady=5, padx=10, fill=tk.X, side=tk.BOTTOM)

    def create_game_area(self, parent):
        """建立遊戲區域"""
        game_frame = tk.Frame(parent, bg=self.colors['btn_bg'])
        game_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # 題目顯示區域
        self.question_display = scrolledtext.ScrolledText(
            game_frame,
            wrap=tk.WORD,
            font=("Arial", 14),
            bg=self.colors['bg'],
            fg=self.colors['text'],
            height=15,
            state=tk.DISABLED
        )
        self.question_display.pack(pady=10, padx=10, fill=tk.BOTH, expand=True)

        # 答案輸入區域
        answer_frame = tk.Frame(game_frame, bg=self.colors['btn_bg'])
        answer_frame.pack(pady=10, padx=10, fill=tk.X)

        tk.Label(
            answer_frame,
            text="你的答案：",
            font=("Arial", 12, "bold"),
            bg=self.colors['btn_bg'],
            fg=self.colors['text']
        ).pack(side=tk.LEFT, padx=5)

        self.answer_entry = tk.Entry(
            answer_frame,
            font=("Arial", 12),
            width=30
        )
        self.answer_entry.pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)
        self.answer_entry.bind('<Return>', lambda e: self.submit_answer())

        self.create_button(
            answer_frame,
            "✅ 提交答案",
            self.submit_answer,
            self.colors['grass']
        ).pack(side=tk.LEFT, padx=5)

        # 下一題按鈕
        self.create_button(
            game_frame,
            "➡️ 下一題",
            self.next_question,
            self.colors['diamond']
        ).pack(pady=10)

        # 顯示歡迎訊息
        self.show_welcome_message()

    def create_button(self, parent, text, command, bg_color, font_size=10):
        """建立 Minecraft 風格按鈕"""
        btn = tk.Button(
            parent,
            text=text,
            command=command,
            font=("Arial", font_size, "bold"),
            bg=bg_color,
            fg=self.colors['text'],
            activebackground=self.colors['btn_hover'],
            activeforeground=self.colors['text'],
            relief=tk.RAISED,
            bd=3,
            cursor="hand2"
        )
        return btn

    def show_welcome_message(self):
        """顯示歡迎訊息"""
        welcome_text = f"""
🎮 歡迎來到 Minecraft 測驗遊戲！ 🎮

📊 目前狀態：
💰 金幣: {self.coins}
❤️ 體力: {self.health}/{self.max_health}
📚 題庫: {len(self.questions)} 題
💎 答對率: {self.score}/{self.total_answered}

📚 如何開始：
1. 點擊「上傳題目檔案」或「智能輸入題目」來新增題目
2. 設定你想要的出題範圍
3. 點擊「開始測驗」開始答題

💡 遊戲規則：
- ✅ 答對一題 → 獲得 10 金幣
- ❌ 答錯一題 → 扣除 1 體力
- 💀 體力歸零 → 遊戲結束
- 🏪 使用金幣購買道具幫助你通關

祝你測驗順利！⛏️
        """
        self.update_question_display(welcome_text)

    def update_question_display(self, text):
        """更新題目顯示區域"""
        self.question_display.config(state=tk.NORMAL)
        self.question_display.delete(1.0, tk.END)
        self.question_display.insert(1.0, text)
        self.question_display.config(state=tk.DISABLED)

    def update_ui(self):
        """更新所有 UI 元素"""
        self.coin_label.config(text=f"💰 {self.coins}")
        self.health_label.config(text=f"❤️ {self.health}/{self.max_health}")
        self.score_display.config(text=f"💎 {self.score}/{self.total_answered}")
        self.question_count_label.config(text=f"📚 題庫: {len(self.questions)} 題")

        # 更新結束範圍
        if self.questions:
            self.end_entry.delete(0, tk.END)
            self.end_entry.insert(0, str(len(self.questions)))

    def upload_questions(self):
        """上傳題目檔案"""
        file_path = filedialog.askopenfilename(
            title="選擇題目檔案",
            filetypes=[("文字檔案", "*.txt"), ("CSV 檔案", "*.csv"), ("所有檔案", "*.*")]
        )

        if not file_path:
            return

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            new_questions = []
            for line in lines:
                line = line.strip()
                if line and '|' in line:
                    parts = line.split('|')
                    if len(parts) >= 2:
                        question = parts[0].strip()
                        answer = parts[1].strip()
                        new_questions.append({'question': question, 'answer': answer})

            if new_questions:
                self.questions.extend(new_questions)
                self.save_game_data()
                self.update_ui()
                messagebox.showinfo(
                    "成功",
                    f"成功載入 {len(new_questions)} 題！\n目前題庫共有 {len(self.questions)} 題。"
                )
            else:
                messagebox.showwarning("警告", "檔案中沒有找到有效的題目！\n請確認格式：問題|答案")

        except Exception as e:
            messagebox.showerror("錯誤", f"讀取檔案時發生錯誤：{str(e)}")

    def smart_input_questions(self):
        """智能輸入題目（使用 AI 或規則拆解）"""
        input_window = tk.Toplevel(self.root)
        input_window.title("智能輸入題目")
        input_window.geometry("700x600")
        input_window.configure(bg=self.colors['bg'])

        tk.Label(
            input_window,
            text="📋 直接貼上考卷內容，AI 會自動拆解題目",
            font=("Arial", 14, "bold"),
            bg=self.colors['bg'],
            fg=self.colors['gold']
        ).pack(pady=10)

        tk.Label(
            input_window,
            text="支援格式：任何包含問題和答案的文字（AI 會智能識別）",
            font=("Arial", 10),
            bg=self.colors['bg'],
            fg=self.colors['text']
        ).pack(pady=5)

        text_area = scrolledtext.ScrolledText(
            input_window,
            wrap=tk.WORD,
            font=("Arial", 11),
            height=25
        )
        text_area.pack(pady=10, padx=10, fill=tk.BOTH, expand=True)

        text_area.insert(1.0, """範例 1（標準格式）：
1+1=? 答案：2
2+2=? 答案：4

範例 2（問答格式）：
問：台灣的首都是哪裡？
答：台北

範例 3（簡單格式）：
1. 3x3=? (9)
2. 首都 (台北)

直接貼上你的考卷內容，程式會自動解析！""")

        def process_smart_input():
            content = text_area.get(1.0, tk.END).strip()

            if not content:
                messagebox.showwarning("警告", "請輸入內容！")
                return

            # TODO: 這裡可以整合 Claude API 進行智能拆解
            # 目前先使用規則匹配
            new_questions = self.parse_questions_with_rules(content)

            if new_questions:
                self.questions.extend(new_questions)
                self.save_game_data()
                self.update_ui()
                messagebox.showinfo(
                    "成功",
                    f"成功解析 {len(new_questions)} 題！\n目前題庫共有 {len(self.questions)} 題。"
                )
                input_window.destroy()
            else:
                messagebox.showwarning(
                    "警告",
                    "無法解析題目！\n\n建議格式：\n1. 問題 | 答案\n2. 問題 答案：XXX\n3. 問：XXX 答：XXX"
                )

        btn_frame = tk.Frame(input_window, bg=self.colors['bg'])
        btn_frame.pack(pady=10)

        self.create_button(
            btn_frame,
            "🤖 智能解析",
            process_smart_input,
            self.colors['emerald'],
            font_size=12
        ).pack(side=tk.LEFT, padx=5)

        self.create_button(
            btn_frame,
            "❌ 取消",
            input_window.destroy,
            self.colors['redstone']
        ).pack(side=tk.LEFT, padx=5)

    def parse_questions_with_rules(self, content):
        """使用規則解析題目"""
        import re

        questions = []
        lines = content.split('\n')

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 格式 1: 問題|答案
            if '|' in line:
                parts = line.split('|')
                if len(parts) >= 2:
                    q = parts[0].strip()
                    a = parts[1].strip()
                    questions.append({'question': q, 'answer': a})
                    continue

            # 格式 2: 問題 答案：XXX 或 答：XXX
            match = re.search(r'(.+?)[  ]*(?:答案?[:：]|answer:)\s*(.+)', line, re.IGNORECASE)
            if match:
                q = match.group(1).strip()
                a = match.group(2).strip()
                # 清理題號
                q = re.sub(r'^\d+[\.)、]\s*', '', q)
                questions.append({'question': q, 'answer': a})
                continue

            # 格式 3: 問：XXX 答：XXX
            match = re.search(r'(?:問|question|Q)[:：]\s*(.+?)[  ]*(?:答|answer|A)[:：]\s*(.+)', line, re.IGNORECASE)
            if match:
                q = match.group(1).strip()
                a = match.group(2).strip()
                questions.append({'question': q, 'answer': a})
                continue

            # 格式 4: 題目 (答案)
            match = re.search(r'(.+?)\s*[\(（](.+?)[\)）]', line)
            if match:
                q = match.group(1).strip()
                a = match.group(2).strip()
                # 清理題號
                q = re.sub(r'^\d+[\.)、]\s*', '', q)
                questions.append({'question': q, 'answer': a})
                continue

        return questions

    def view_all_questions(self):
        """檢視所有題目"""
        if not self.questions:
            messagebox.showinfo("提示", "目前題庫是空的！\n請先新增題目。")
            return

        view_window = tk.Toplevel(self.root)
        view_window.title("題庫總覽")
        view_window.geometry("700x500")
        view_window.configure(bg=self.colors['bg'])

        tk.Label(
            view_window,
            text=f"📚 題庫總覽（共 {len(self.questions)} 題）",
            font=("Arial", 14, "bold"),
            bg=self.colors['bg'],
            fg=self.colors['gold']
        ).pack(pady=10)

        text_area = scrolledtext.ScrolledText(
            view_window,
            wrap=tk.WORD,
            font=("Arial", 11),
            height=25
        )
        text_area.pack(pady=10, padx=10, fill=tk.BOTH, expand=True)

        for i, q in enumerate(self.questions, 1):
            text_area.insert(tk.END, f"第 {i} 題：\n")
            text_area.insert(tk.END, f"  問題：{q['question']}\n")
            text_area.insert(tk.END, f"  答案：{q['answer']}\n\n")

        text_area.config(state=tk.DISABLED)

        btn_frame = tk.Frame(view_window, bg=self.colors['bg'])
        btn_frame.pack(pady=10)

        self.create_button(
            btn_frame,
            "🗑️ 清空題庫",
            lambda: self.clear_questions(view_window),
            self.colors['redstone']
        ).pack(side=tk.LEFT, padx=5)

        self.create_button(
            btn_frame,
            "❌ 關閉",
            view_window.destroy,
            self.colors['stone']
        ).pack(side=tk.LEFT, padx=5)

    def clear_questions(self, window):
        """清空題庫"""
        if messagebox.askyesno("確認", "確定要清空所有題目嗎？"):
            self.questions = []
            self.save_game_data()
            self.update_ui()
            messagebox.showinfo("完成", "題庫已清空！")
            window.destroy()

    def start_quiz(self):
        """開始測驗"""
        if not self.questions:
            messagebox.showwarning("警告", "題庫是空的！\n請先新增題目。")
            return

        if self.health <= 0:
            messagebox.showerror("遊戲結束", "你的體力已耗盡！\n請使用生命藥水恢復體力。")
            return

        try:
            start = int(self.start_entry.get()) - 1
            end = int(self.end_entry.get())

            if start < 0 or end > len(self.questions) or start >= end:
                messagebox.showerror(
                    "錯誤",
                    f"範圍設定錯誤！\n請設定 1 到 {len(self.questions)} 之間的有效範圍。"
                )
                return

            self.question_range = (start, end)

            messagebox.showinfo(
                "測驗開始",
                f"準備開始測驗！\n將從第 {start + 1} 題到第 {end} 題隨機出題。\n\n加油！💎"
            )

            self.next_question()

        except ValueError:
            messagebox.showerror("錯誤", "請輸入有效的數字！")

    def next_question(self):
        """下一題"""
        if not self.questions or self.question_range == (0, 0):
            messagebox.showwarning("提示", "請先設定範圍並開始測驗！")
            return

        if self.health <= 0:
            self.game_over()
            return

        start, end = self.question_range
        available_questions = list(range(start, end))

        if not available_questions:
            messagebox.showinfo("完成", "沒有更多題目了！")
            return

        self.current_question_index = random.choice(available_questions)
        current_q = self.questions[self.current_question_index]

        bonus_text = ""
        if self.double_coins_remaining > 0:
            bonus_text = f"\n🌟 雙倍金幣效果中！（剩餘 {self.double_coins_remaining} 題）"

        question_text = f"""
📝 題目 #{self.current_question_index + 1}

{current_q['question']}{bonus_text}

請在下方輸入你的答案：
        """

        self.update_question_display(question_text)
        self.answer_entry.delete(0, tk.END)
        self.answer_entry.focus()

    def submit_answer(self):
        """提交答案"""
        if self.current_question_index == -1:
            messagebox.showwarning("提示", "請先開始測驗！")
            return

        user_answer = self.answer_entry.get().strip()
        if not user_answer:
            messagebox.showwarning("提示", "請輸入答案！")
            return

        correct_answer = self.questions[self.current_question_index]['answer']

        self.total_answered += 1

        if user_answer.lower() == correct_answer.lower():
            # 答對
            self.score += 1

            # 計算金幣獎勵
            coin_reward = 10
            if self.double_coins_remaining > 0:
                coin_reward *= 2
                self.double_coins_remaining -= 1

            self.coins += coin_reward

            result_text = f"""
✅ 答對了！

你的答案：{user_answer}
正確答案：{correct_answer}

💰 獲得 {coin_reward} 金幣！
太棒了！繼續加油！ 💎
            """
            messagebox.showinfo("正確", f"答對了！🎉\n獲得 {coin_reward} 金幣！")
        else:
            # 答錯
            self.health -= 1

            result_text = f"""
❌ 答錯了！

你的答案：{user_answer}
正確答案：{correct_answer}

💔 扣除 1 體力（剩餘 {self.health}/{self.max_health}）
沒關係，下次會更好！ ⛏️
            """
            messagebox.showwarning("錯誤", f"答錯了！\n正確答案是：{correct_answer}\n\n體力 -1")

        self.update_question_display(result_text)
        self.update_ui()
        self.save_game_data()
        self.answer_entry.delete(0, tk.END)

        # 檢查是否體力耗盡
        if self.health <= 0:
            self.root.after(1000, self.game_over)

    def game_over(self):
        """遊戲結束"""
        result = messagebox.askyesno(
            "遊戲結束",
            f"你的體力已耗盡！\n\n💎 最終分數：{self.score}/{self.total_answered}\n💰 剩餘金幣：{self.coins}\n\n是否重置體力繼續遊戲？\n（將消耗所有金幣）"
        )

        if result and self.coins >= 100:
            self.health = self.max_health
            self.coins -= 100
            self.update_ui()
            self.save_game_data()
            messagebox.showinfo("復活", "體力已恢復！繼續努力！")
        elif result:
            messagebox.showwarning("金幣不足", "需要 100 金幣才能復活！")

    def open_shop(self):
        """開啟商店"""
        shop_window = tk.Toplevel(self.root)
        shop_window.title("🏪 Minecraft 商店")
        shop_window.geometry("600x500")
        shop_window.configure(bg=self.colors['bg'])

        # 標題
        tk.Label(
            shop_window,
            text="🏪 Minecraft 商店",
            font=("Arial", 18, "bold"),
            bg=self.colors['bg'],
            fg=self.colors['gold']
        ).pack(pady=10)

        tk.Label(
            shop_window,
            text=f"💰 你的金幣: {self.coins}",
            font=("Arial", 14),
            bg=self.colors['bg'],
            fg=self.colors['gold']
        ).pack(pady=5)

        # 商品列表
        items_frame = tk.Frame(shop_window, bg=self.colors['bg'])
        items_frame.pack(pady=20, padx=20, fill=tk.BOTH, expand=True)

        # 生命藥水
        self.create_shop_item(
            items_frame,
            'health_potion',
            "❤️ 生命藥水",
            "恢復 20 點體力",
            50
        )

        # 跳過券
        self.create_shop_item(
            items_frame,
            'skip_ticket',
            "⏭️ 跳過券",
            "跳過當前題目（不扣分也不扣血）",
            30
        )

        # 雙倍金幣
        self.create_shop_item(
            items_frame,
            'double_coins',
            "💰 雙倍金幣卡",
            "接下來 5 題答對獲得雙倍金幣",
            100
        )

        # 關閉按鈕
        self.create_button(
            shop_window,
            "❌ 關閉商店",
            shop_window.destroy,
            self.colors['redstone']
        ).pack(pady=10)

    def create_shop_item(self, parent, item_id, name, description, price):
        """建立商店物品"""
        item_frame = tk.Frame(parent, bg=self.colors['stone'], relief=tk.RAISED, bd=3)
        item_frame.pack(pady=10, fill=tk.X)

        info_frame = tk.Frame(item_frame, bg=self.colors['stone'])
        info_frame.pack(side=tk.LEFT, padx=10, pady=10)

        tk.Label(
            info_frame,
            text=name,
            font=("Arial", 14, "bold"),
            bg=self.colors['stone'],
            fg=self.colors['gold']
        ).pack(anchor=tk.W)

        tk.Label(
            info_frame,
            text=description,
            font=("Arial", 10),
            bg=self.colors['stone'],
            fg=self.colors['text']
        ).pack(anchor=tk.W)

        tk.Label(
            info_frame,
            text=f"💰 價格: {price} 金幣",
            font=("Arial", 11, "bold"),
            bg=self.colors['stone'],
            fg=self.colors['gold']
        ).pack(anchor=tk.W)

        self.create_button(
            item_frame,
            "購買",
            lambda: self.buy_item(item_id),
            self.colors['emerald']
        ).pack(side=tk.RIGHT, padx=10, pady=10)

    def buy_item(self, item_id):
        """購買物品"""
        item = self.items[item_id]

        if self.coins < item['price']:
            messagebox.showwarning("金幣不足", f"需要 {item['price']} 金幣！\n你目前只有 {self.coins} 金幣。")
            return

        self.coins -= item['price']
        self.inventory[item_id] += 1

        self.update_ui()
        self.save_game_data()

        messagebox.showinfo(
            "購買成功",
            f"成功購買 {item['name']}！\n已加入背包。"
        )

    def open_inventory(self):
        """開啟背包"""
        inv_window = tk.Toplevel(self.root)
        inv_window.title("🎒 背包")
        inv_window.geometry("500x400")
        inv_window.configure(bg=self.colors['bg'])

        tk.Label(
            inv_window,
            text="🎒 我的背包",
            font=("Arial", 18, "bold"),
            bg=self.colors['bg'],
            fg=self.colors['gold']
        ).pack(pady=10)

        items_frame = tk.Frame(inv_window, bg=self.colors['bg'])
        items_frame.pack(pady=20, padx=20, fill=tk.BOTH, expand=True)

        # 顯示所有道具
        for item_id, item_data in self.items.items():
            count = self.inventory[item_id]

            item_frame = tk.Frame(items_frame, bg=self.colors['stone'], relief=tk.RAISED, bd=3)
            item_frame.pack(pady=5, fill=tk.X)

            tk.Label(
                item_frame,
                text=f"{item_data['name']} x{count}",
                font=("Arial", 12, "bold"),
                bg=self.colors['stone'],
                fg=self.colors['text']
            ).pack(side=tk.LEFT, padx=10, pady=10)

            if count > 0:
                self.create_button(
                    item_frame,
                    "使用",
                    lambda iid=item_id: self.use_item(iid, inv_window),
                    self.colors['emerald']
                ).pack(side=tk.RIGHT, padx=10, pady=10)

        self.create_button(
            inv_window,
            "❌ 關閉",
            inv_window.destroy,
            self.colors['redstone']
        ).pack(pady=10)

    def use_item(self, item_id, window=None):
        """使用道具"""
        if self.inventory[item_id] <= 0:
            messagebox.showwarning("道具不足", "你沒有這個道具！")
            return

        item = self.items[item_id]

        if item['effect'] == 'heal':
            # 生命藥水
            old_health = self.health
            self.health = min(self.max_health, self.health + item['value'])
            healed = self.health - old_health

            self.inventory[item_id] -= 1
            self.update_ui()
            self.save_game_data()

            messagebox.showinfo("使用成功", f"恢復了 {healed} 點體力！\n目前體力：{self.health}/{self.max_health}")

            if window:
                window.destroy()
                self.open_inventory()

        elif item['effect'] == 'skip':
            # 跳過券
            if self.current_question_index == -1:
                messagebox.showwarning("提示", "請先開始測驗才能使用跳過券！")
                return

            self.inventory[item_id] -= 1
            self.update_ui()
            self.save_game_data()

            messagebox.showinfo("使用成功", "已跳過當前題目！")
            self.next_question()

            if window:
                window.destroy()

        elif item['effect'] == 'double':
            # 雙倍金幣
            self.inventory[item_id] -= 1
            self.double_coins_remaining += item['value']
            self.update_ui()
            self.save_game_data()

            messagebox.showinfo(
                "使用成功",
                f"雙倍金幣卡已啟動！\n接下來 {item['value']} 題答對可獲得雙倍金幣！"
            )

            if window:
                window.destroy()

    def manual_save(self):
        """手動存檔"""
        if self.save_game_data():
            messagebox.showinfo("儲存成功", "遊戲已儲存！")
        else:
            messagebox.showerror("儲存失敗", "無法儲存遊戲！")

    def return_to_menu(self):
        """返回主選單"""
        if messagebox.askyesno("確認", "確定要返回主選單嗎？\n遊戲會自動儲存。"):
            self.save_game_data()
            # 清空畫面
            for widget in self.root.winfo_children():
                widget.destroy()
            # 顯示開始畫面
            StartScreen(self.root, lambda slot: start_game(self.root, slot))


def start_game(root, slot_id):
    """開始遊戲"""
    for widget in root.winfo_children():
        widget.destroy()
    MinecraftQuizGame(root, slot_id)


def main():
    root = tk.Tk()
    root.title("🎮 Minecraft 測驗遊戲")
    root.geometry("900x700")

    colors = {
        'bg': '#2C2C2C',
    }
    root.configure(bg=colors['bg'])

    # 顯示開始畫面
    StartScreen(root, lambda slot: start_game(root, slot))

    root.mainloop()


if __name__ == "__main__":
    main()
