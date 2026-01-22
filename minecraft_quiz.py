#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Minecraft 主題測驗遊戲
讓小孩可以透過遊戲化的方式複習功課
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import json
import random
import os

class MinecraftQuizGame:
    def __init__(self, root):
        self.root = root
        self.root.title("🎮 Minecraft 測驗遊戲")
        self.root.geometry("800x600")
        self.root.configure(bg="#2C2C2C")

        # Minecraft 配色
        self.colors = {
            'bg': '#2C2C2C',
            'grass': '#5FAD41',
            'dirt': '#8B6F47',
            'stone': '#7F7F7F',
            'gold': '#FFD700',
            'diamond': '#5DADE2',
            'text': '#FFFFFF',
            'btn_bg': '#4A4A4A',
            'btn_hover': '#6A6A6A'
        }

        # 題目資料
        self.questions = []
        self.current_question_index = -1
        self.score = 0
        self.total_answered = 0
        self.question_range = (0, 0)

        # 載入儲存的題目
        self.load_questions()

        # 建立界面
        self.create_widgets()

    def create_widgets(self):
        """建立主界面"""
        # 標題區域
        title_frame = tk.Frame(self.root, bg=self.colors['grass'], height=80)
        title_frame.pack(fill=tk.X, padx=10, pady=10)
        title_frame.pack_propagate(False)

        title_label = tk.Label(
            title_frame,
            text="⛏️ Minecraft 測驗遊戲 ⛏️",
            font=("Arial", 24, "bold"),
            bg=self.colors['grass'],
            fg=self.colors['text']
        )
        title_label.pack(expand=True)

        # 主要內容區域
        main_frame = tk.Frame(self.root, bg=self.colors['bg'])
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # 左側控制面板
        control_frame = tk.Frame(main_frame, bg=self.colors['stone'], width=250)
        control_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))
        control_frame.pack_propagate(False)

        # 控制面板標題
        control_title = tk.Label(
            control_frame,
            text="📚 控制面板",
            font=("Arial", 14, "bold"),
            bg=self.colors['stone'],
            fg=self.colors['gold']
        )
        control_title.pack(pady=10)

        # 題庫管理按鈕
        self.create_button(
            control_frame,
            "📤 上傳題目檔案",
            self.upload_questions,
            self.colors['dirt']
        ).pack(pady=5, padx=10, fill=tk.X)

        self.create_button(
            control_frame,
            "✏️ 手動輸入題目",
            self.manual_input_questions,
            self.colors['dirt']
        ).pack(pady=5, padx=10, fill=tk.X)

        self.create_button(
            control_frame,
            "📋 檢視所有題目",
            self.view_all_questions,
            self.colors['dirt']
        ).pack(pady=5, padx=10, fill=tk.X)

        # 題目範圍設定
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

        tk.Label(
            range_frame,
            text="題",
            bg=self.colors['stone'],
            fg=self.colors['text']
        ).grid(row=0, column=4, padx=5, pady=5)

        # 開始測驗按鈕
        self.create_button(
            control_frame,
            "🎯 開始測驗！",
            self.start_quiz,
            self.colors['diamond'],
            font_size=12
        ).pack(pady=20, padx=10, fill=tk.X)

        # 分數顯示
        self.score_label = tk.Label(
            control_frame,
            text="💎 分數: 0/0",
            font=("Arial", 14, "bold"),
            bg=self.colors['stone'],
            fg=self.colors['gold']
        )
        self.score_label.pack(pady=10)

        # 題目總數顯示
        self.question_count_label = tk.Label(
            control_frame,
            text=f"📚 題庫: {len(self.questions)} 題",
            font=("Arial", 10),
            bg=self.colors['stone'],
            fg=self.colors['text']
        )
        self.question_count_label.pack(pady=5)

        # 右側測驗區域
        quiz_frame = tk.Frame(main_frame, bg=self.colors['btn_bg'])
        quiz_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)

        # 題目顯示區域
        self.question_display = scrolledtext.ScrolledText(
            quiz_frame,
            wrap=tk.WORD,
            font=("Arial", 14),
            bg=self.colors['bg'],
            fg=self.colors['text'],
            height=10,
            state=tk.DISABLED
        )
        self.question_display.pack(pady=10, padx=10, fill=tk.BOTH, expand=True)

        # 答案輸入區域
        answer_frame = tk.Frame(quiz_frame, bg=self.colors['btn_bg'])
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
            quiz_frame,
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
        welcome_text = """
🎮 歡迎來到 Minecraft 測驗遊戲！ 🎮

📚 如何開始：
1. 點擊「上傳題目檔案」或「手動輸入題目」來新增題目
2. 設定你想要的出題範圍
3. 點擊「開始測驗」開始答題

💡 提示：
- 題目格式：問題|答案
- 可以使用 TXT 或 CSV 檔案
- 每行一題

祝你測驗順利！⛏️
        """
        self.update_question_display(welcome_text)

    def update_question_display(self, text):
        """更新題目顯示區域"""
        self.question_display.config(state=tk.NORMAL)
        self.question_display.delete(1.0, tk.END)
        self.question_display.insert(1.0, text)
        self.question_display.config(state=tk.DISABLED)

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
                self.save_questions()
                self.update_question_count()
                messagebox.showinfo(
                    "成功",
                    f"成功載入 {len(new_questions)} 題！\n目前題庫共有 {len(self.questions)} 題。"
                )
            else:
                messagebox.showwarning("警告", "檔案中沒有找到有效的題目！\n請確認格式：問題|答案")

        except Exception as e:
            messagebox.showerror("錯誤", f"讀取檔案時發生錯誤：{str(e)}")

    def manual_input_questions(self):
        """手動輸入題目"""
        input_window = tk.Toplevel(self.root)
        input_window.title("手動輸入題目")
        input_window.geometry("600x500")
        input_window.configure(bg=self.colors['bg'])

        tk.Label(
            input_window,
            text="輸入題目（每行一題，格式：問題|答案）",
            font=("Arial", 12, "bold"),
            bg=self.colors['bg'],
            fg=self.colors['text']
        ).pack(pady=10)

        text_area = scrolledtext.ScrolledText(
            input_window,
            wrap=tk.WORD,
            font=("Arial", 11),
            height=20
        )
        text_area.pack(pady=10, padx=10, fill=tk.BOTH, expand=True)

        text_area.insert(1.0, "例如：\n1+1=?|2\n2+2=?|4\n3x3=?|9")

        def save_manual_questions():
            content = text_area.get(1.0, tk.END).strip()
            lines = content.split('\n')

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
                self.save_questions()
                self.update_question_count()
                messagebox.showinfo(
                    "成功",
                    f"成功新增 {len(new_questions)} 題！\n目前題庫共有 {len(self.questions)} 題。"
                )
                input_window.destroy()
            else:
                messagebox.showwarning("警告", "沒有找到有效的題目！\n請確認格式：問題|答案")

        self.create_button(
            input_window,
            "💾 儲存題目",
            save_manual_questions,
            self.colors['grass']
        ).pack(pady=10)

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
            self.colors['dirt']
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
            self.save_questions()
            self.update_question_count()
            messagebox.showinfo("完成", "題庫已清空！")
            window.destroy()

    def start_quiz(self):
        """開始測驗"""
        if not self.questions:
            messagebox.showwarning("警告", "題庫是空的！\n請先新增題目。")
            return

        try:
            start = int(self.start_entry.get()) - 1  # 轉換為 0-based index
            end = int(self.end_entry.get())

            if start < 0 or end > len(self.questions) or start >= end:
                messagebox.showerror(
                    "錯誤",
                    f"範圍設定錯誤！\n請設定 1 到 {len(self.questions)} 之間的有效範圍。"
                )
                return

            self.question_range = (start, end)
            self.score = 0
            self.total_answered = 0
            self.update_score()

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

        start, end = self.question_range
        available_questions = list(range(start, end))

        if not available_questions:
            messagebox.showinfo("完成", "沒有更多題目了！")
            return

        self.current_question_index = random.choice(available_questions)
        current_q = self.questions[self.current_question_index]

        question_text = f"""
📝 題目 #{self.current_question_index + 1}

{current_q['question']}

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
        correct_answer = self.questions[self.current_question_index]['answer']

        self.total_answered += 1

        if user_answer.lower() == correct_answer.lower():
            self.score += 1
            result_text = f"""
✅ 答對了！

你的答案：{user_answer}
正確答案：{correct_answer}

太棒了！繼續加油！ 💎
            """
            messagebox.showinfo("正確", "答對了！ 🎉")
        else:
            result_text = f"""
❌ 答錯了！

你的答案：{user_answer}
正確答案：{correct_answer}

沒關係，下次會更好！ ⛏️
            """
            messagebox.showinfo("錯誤", f"答錯了！\n正確答案是：{correct_answer}")

        self.update_question_display(result_text)
        self.update_score()
        self.answer_entry.delete(0, tk.END)

    def update_score(self):
        """更新分數顯示"""
        self.score_label.config(text=f"💎 分數: {self.score}/{self.total_answered}")

    def update_question_count(self):
        """更新題目總數顯示"""
        self.question_count_label.config(text=f"📚 題庫: {len(self.questions)} 題")
        if self.questions:
            self.end_entry.delete(0, tk.END)
            self.end_entry.insert(0, str(len(self.questions)))

    def save_questions(self):
        """儲存題目到檔案"""
        try:
            with open('questions.json', 'w', encoding='utf-8') as f:
                json.dump(self.questions, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"儲存題目時發生錯誤：{e}")

    def load_questions(self):
        """載入儲存的題目"""
        if os.path.exists('questions.json'):
            try:
                with open('questions.json', 'r', encoding='utf-8') as f:
                    self.questions = json.load(f)
            except Exception as e:
                print(f"載入題目時發生錯誤：{e}")
                self.questions = []

def main():
    root = tk.Tk()
    app = MinecraftQuizGame(root)
    root.mainloop()

if __name__ == "__main__":
    main()
