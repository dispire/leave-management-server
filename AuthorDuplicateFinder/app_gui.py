import os
import re
import csv
import sys
import subprocess
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

class AuthorDuplicateFinder:
    def __init__(self, root):
        self.root = root
        self.root.title("폴더 간 작가명 중복 검색 및 데이터 분석기 v1.0")
        self.root.geometry("980x720")
        self.root.minsize(800, 550)

        # 변수 정의
        self.folder_a_path = tk.StringVar()
        self.folder_b_path = tk.StringVar()
        self.include_subfolders = tk.BooleanVar(value=False)
        self.search_keyword = tk.StringVar()
        
        self.results_data = []  # 전체 분석 결과 데이터
        self.map_a = {}
        self.map_b = {}
        self.sort_column = None
        self.sort_reverse = False

        self._configure_style()
        self._build_ui()

    def _configure_style(self):
        style = ttk.Style()
        if "clam" in style.theme_names():
            style.theme_use("clam")
        
        # 커스텀 폰트 및 스타일
        font_family = "맑은 고딕"
        style.configure(".", font=(font_family, 9))
        style.configure("Header.TLabel", font=(font_family, 14, "bold"))
        style.configure("SubHeader.TLabel", font=(font_family, 10, "bold"), foreground="#2b5797")
        style.configure("Summary.TLabel", font=(font_family, 10, "bold"), foreground="#1e6b37")
        style.configure("Treeview.Heading", font=(font_family, 9, "bold"), background="#e1e6ef")
        style.configure("Treeview", rowheight=24)

    def _build_ui(self):
        # 1. 상단 타이틀 헤더
        title_frame = ttk.Frame(self.root, padding=(15, 10, 15, 5))
        title_frame.pack(fill="x")
        ttk.Label(title_frame, text="📚 폴더 간 작가명 [작가명] 중복 비교 분석기", style="Header.TLabel").pack(anchor="w")
        ttk.Label(title_frame, text="두 폴더 내 파일명의 [작가명] 규칙을 파싱하여 겹치는 작가와 매칭 파일 목록을 추출합니다.", foreground="#555555").pack(anchor="w", pady=(2, 0))

        # 2. 폴더 설정 프레임
        control_frame = ttk.LabelFrame(self.root, text=" 📂 비교 대상 폴더 설정 ", padding=12)
        control_frame.pack(fill="x", padx=15, pady=8)

        # 폴더 A 선택
        ttk.Label(control_frame, text="기준 폴더 A:", font=("맑은 고딕", 9, "bold")).grid(row=0, column=0, sticky="w", pady=4)
        ttk.Entry(control_frame, textvariable=self.folder_a_path, width=65).grid(row=0, column=1, padx=8, pady=4, sticky="ew")
        ttk.Button(control_frame, text="📁 폴더 선택 A", command=self._browse_folder_a).grid(row=0, column=2, pady=4)

        # 폴더 B 선택
        ttk.Label(control_frame, text="비교 폴더 B:", font=("맑은 고딕", 9, "bold")).grid(row=1, column=0, sticky="w", pady=4)
        ttk.Entry(control_frame, textvariable=self.folder_b_path, width=65).grid(row=1, column=1, padx=8, pady=4, sticky="ew")
        ttk.Button(control_frame, text="📁 폴더 선택 B", command=self._browse_folder_b).grid(row=1, column=2, pady=4)

        # 옵션 및 실행 버튼 행
        option_frame = ttk.Frame(control_frame)
        option_frame.grid(row=2, column=0, columnspan=3, pady=(8, 0), sticky="ew")

        ttk.Checkbutton(option_frame, text="🔄 하위 폴더까지 포함하여 스캔 (재귀 탐색)", variable=self.include_subfolders).pack(side="left")
        
        btn_compare = ttk.Button(option_frame, text="🔍 중복 비교 시작", command=self._run_compare)
        btn_compare.pack(side="right", padx=(4, 0))
        
        btn_export = ttk.Button(option_frame, text="💾 CSV 결과 내보내기 (Excel 호환)", command=self._export_csv)
        btn_export.pack(side="right", padx=4)

        control_frame.columnconfigure(1, weight=1)

        # 3. 결과 요약 및 필터 프레임
        filter_frame = ttk.Frame(self.root, padding=(15, 5, 15, 5))
        filter_frame.pack(fill="x")

        self.summary_label = ttk.Label(filter_frame, text="💡 폴더 선택 후 '중복 비교 시작' 버튼을 눌러주세요.", style="Summary.TLabel")
        self.summary_label.pack(side="left")

        # 실시간 검색 입력
        search_sub_frame = ttk.Frame(filter_frame)
        search_sub_frame.pack(side="right")
        ttk.Label(search_sub_frame, text="🔎 결과 내 검색:").pack(side="left", padx=(0, 4))
        search_entry = ttk.Entry(search_sub_frame, textvariable=self.search_keyword, width=20)
        search_entry.pack(side="left")
        search_entry.bind("<KeyRelease>", self._filter_results)

        # 4. 하단 트리뷰 (결과 테이블) 프레임
        result_frame = ttk.LabelFrame(self.root, text=" 📊 중복 작가명 비교 분석 결과 (항목 더블 클릭 시 상세 보기) ", padding=10)
        result_frame.pack(fill="both", expand=True, padx=15, pady=(5, 15))

        columns = ("author", "count_a", "files_a", "count_b", "files_b")
        self.tree = ttk.Treeview(result_frame, columns=columns, show="headings", selectmode="extended")
        
        self.tree.heading("author", text="중복 작가명 ⇅", anchor="center", command=lambda: self._sort_by_column("author"))
        self.tree.heading("count_a", text="폴더 A 파일수 ⇅", anchor="center", command=lambda: self._sort_by_column("count_a"))
        self.tree.heading("files_a", text="폴더 A 매칭 파일 목록", anchor="w")
        self.tree.heading("count_b", text="폴더 B 파일수 ⇅", anchor="center", command=lambda: self._sort_by_column("count_b"))
        self.tree.heading("files_b", text="폴더 B 매칭 파일 목록", anchor="w")

        self.tree.column("author", width=140, minwidth=100, stretch=False, anchor="center")
        self.tree.column("count_a", width=100, minwidth=80, stretch=False, anchor="center")
        self.tree.column("files_a", width=330, minwidth=200, stretch=True)
        self.tree.column("count_b", width=100, minwidth=80, stretch=False, anchor="center")
        self.tree.column("files_b", width=330, minwidth=200, stretch=True)

        y_scroll = ttk.Scrollbar(result_frame, orient="vertical", command=self.tree.yview)
        x_scroll = ttk.Scrollbar(result_frame, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=y_scroll.set, xscrollcommand=x_scroll.set)

        self.tree.pack(side="top", fill="both", expand=True)
        y_scroll.pack(side="right", fill="y")
        x_scroll.pack(side="bottom", fill="x")

        # 더블 클릭 이벤트 바인딩
        self.tree.bind("<Double-1>", self._on_item_double_click)

    def _browse_folder_a(self):
        selected = filedialog.askdirectory(title="기준 폴더 A 선택")
        if selected:
            self.folder_a_path.set(selected)

    def _browse_folder_b(self):
        selected = filedialog.askdirectory(title="비교 폴더 B 선택")
        if selected:
            self.folder_b_path.set(selected)

    @staticmethod
    def extract_author(filename):
        """
        파일명 맨 앞의 대괄호 [작가명] 패턴을 정규식으로 추출합니다.
        예: '[홍길동] 소설.txt' -> '홍길동'
        """
        match = re.match(r"^\[(.*?)\]", filename)
        if match:
            author = match.group(1).strip()
            return author if author else None
        return None

    def _scan_folder(self, base_path, recursive):
        """
        지정된 폴더에서 파일별 작가명 파싱 후 {작가명: [(파일명, 전체경로), ...]} 반환
        """
        author_dict = {}
        if recursive:
            for root, _, files in os.walk(base_path):
                for f in files:
                    author = self.extract_author(f)
                    if author:
                        full_path = os.path.join(root, f)
                        author_dict.setdefault(author, []).append((f, full_path))
        else:
            try:
                for entry in os.listdir(base_path):
                    full_path = os.path.join(base_path, entry)
                    if os.path.isfile(full_path):
                        author = self.extract_author(entry)
                        if author:
                            author_dict.setdefault(author, []).append((entry, full_path))
            except Exception as e:
                messagebox.showerror("오류", f"폴더 탐색 중 오류 발생 ({base_path}):\n{e}")
        return author_dict

    def _run_compare(self):
        dir_a = self.folder_a_path.get().strip()
        dir_b = self.folder_b_path.get().strip()

        if not dir_a or not os.path.isdir(dir_a):
            messagebox.showwarning("경고", "올바른 기준 폴더 A 경로를 선택해 주세요.")
            return
        if not dir_b or not os.path.isdir(dir_b):
            messagebox.showwarning("경고", "올바른 비교 폴더 B 경로를 선택해 주세요.")
            return

        recursive = self.include_subfolders.get()
        self.map_a = self._scan_folder(dir_a, recursive)
        self.map_b = self._scan_folder(dir_b, recursive)

        common_authors = sorted(list(set(self.map_a.keys()) & set(self.map_b.keys())))

        self.results_data.clear()
        for author in common_authors:
            items_a = self.map_a[author]
            items_b = self.map_b[author]

            filenames_a = [item[0] for item in items_a]
            filenames_b = [item[0] for item in items_b]

            self.results_data.append({
                "author": author,
                "count_a": len(items_a),
                "filenames_a": filenames_a,
                "items_a": items_a,
                "display_a": ", ".join(filenames_a),
                "count_b": len(items_b),
                "filenames_b": filenames_b,
                "items_b": items_b,
                "display_b": ", ".join(filenames_b)
            })

        self._update_treeview(self.results_data)

        # 요약 라벨 업데이트
        self.summary_label.config(
            text=f"✅ 분석 완료: 폴더 A 작가 ({len(self.map_a)}명) | 폴더 B 작가 ({len(self.map_b)}명) | 겹치는 중복 작가: 총 {len(common_authors)}명"
        )

        if not common_authors:
            messagebox.showinfo("알림", "두 폴더 간에 파일명이 겹치는 [작가명]이 존재하지 않습니다.")

    def _update_treeview(self, data_list):
        for item in self.tree.get_children():
            self.tree.delete(item)

        for row in data_list:
            self.tree.insert(
                "",
                "end",
                values=(
                    row["author"],
                    f"{row['count_a']}개",
                    row["display_a"],
                    f"{row['count_b']}개",
                    row["display_b"]
                )
            )

    def _filter_results(self, event=None):
        keyword = self.search_keyword.get().strip().lower()
        if not keyword:
            self._update_treeview(self.results_data)
            return

        filtered = []
        for row in self.results_data:
            if (keyword in row["author"].lower() or 
                keyword in row["display_a"].lower() or 
                keyword in row["display_b"].lower()):
                filtered.append(row)
        self._update_treeview(filtered)

    def _sort_by_column(self, col):
        if self.sort_column == col:
            self.sort_reverse = not self.sort_reverse
        else:
            self.sort_column = col
            self.sort_reverse = False

        if col == "author":
            self.results_data.sort(key=lambda x: x["author"], reverse=self.sort_reverse)
        elif col == "count_a":
            self.results_data.sort(key=lambda x: x["count_a"], reverse=self.sort_reverse)
        elif col == "count_b":
            self.results_data.sort(key=lambda x: x["count_b"], reverse=self.sort_reverse)

        self._filter_results()

    def _on_item_double_click(self, event):
        selected_item = self.tree.selection()
        if not selected_item:
            return

        item_values = self.tree.item(selected_item[0], "values")
        author_name = item_values[0]

        # 데이터 구조 찾기
        target_row = next((r for r in self.results_data if r["author"] == author_name), None)
        if not target_row:
            return

        # 상세 매칭 정보 모달 창 띄우기
        detail_win = tk.Toplevel(self.root)
        detail_win.title(f"[{author_name}] 작가 상세 파일 목록 및 위치")
        detail_win.geometry("700x500")
        detail_win.transient(self.root)
        detail_win.grab_set()

        ttk.Label(detail_win, text=f"👤 작가명: {author_name}", font=("맑은 고딕", 12, "bold"), foreground="#2b5797").pack(anchor="w", padx=15, pady=(15, 5))

        notebook = ttk.Notebook(detail_win)
        notebook.pack(fill="both", expand=True, padx=15, pady=10)

        # 탭 1: 폴더 A 파일 목록
        tab_a = ttk.Frame(notebook, padding=10)
        notebook.add(tab_a, text=f"폴더 A 파일 ({target_row['count_a']}개)")
        self._build_detail_tab(tab_a, target_row["items_a"])

        # 탭 2: 폴더 B 파일 목록
        tab_b = ttk.Frame(notebook, padding=10)
        notebook.add(tab_b, text=f"폴더 B 파일 ({target_row['count_b']}개)")
        self._build_detail_tab(tab_b, target_row["items_b"])

    def _build_detail_tab(self, parent, items):
        listbox = tk.Listbox(parent, selectmode="single", font=("맑은 고딕", 9))
        listbox.pack(side="top", fill="both", expand=True)

        for filename, full_path in items:
            listbox.insert("end", f"📄 {filename}  ({full_path})")

        btn_frame = ttk.Frame(parent, padding=(0, 8, 0, 0))
        btn_frame.pack(fill="x")

        def _open_folder():
            sel = listbox.curselection()
            if sel:
                idx = sel[0]
                _, target_path = items[idx]
                folder_path = os.path.dirname(target_path)
            elif items:
                folder_path = os.path.dirname(items[0][1])
            else:
                return

            if os.path.exists(folder_path):
                if sys.platform == "win32":
                    os.startfile(folder_path)
                else:
                    subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", folder_path])
            else:
                messagebox.showerror("오류", f"존재하지 않는 폴더 경로입니다:\n{folder_path}")

        ttk.Button(btn_frame, text="📂 선택 파일 탐색기에서 위치 열기", command=_open_folder).pack(side="right")

    def _export_csv(self):
        if not self.results_data:
            messagebox.showwarning("경고", "내보낼 중복 분석 결과 데이터가 없습니다. 먼저 중복 비교를 수행해 주세요.")
            return

        save_path = filedialog.asksaveasfilename(
            title="CSV 결과 파일 내보내기",
            defaultextension=".csv",
            filetypes=[("Excel 호환 CSV 파일", "*.csv"), ("모든 파일", "*.*")]
        )
        if not save_path:
            return

        try:
            # utf-8-sig 인코딩을 지정하여 Excel에서 한글 깨짐 없이 바로 열림
            with open(save_path, "w", newline="", encoding="utf-8-sig") as f:
                writer = csv.writer(f)
                # 헤더 작성
                writer.writerow(["중복 작가명", "폴더 A 파일 수", "폴더 A 파일 목록", "폴더 B 파일 수", "폴더 B 파일 목록"])
                for row in self.results_data:
                    writer.writerow([
                        row["author"],
                        row["count_a"],
                        "\n".join(row["filenames_a"]),
                        row["count_b"],
                        "\n".join(row["filenames_b"])
                    ])
            messagebox.showinfo("완료", f"분석 결과가 정상적으로 내보내졌습니다:\n{save_path}")
        except Exception as e:
            messagebox.showerror("내보내기 오류", f"파일 저장 중 오류가 발생했습니다:\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = AuthorDuplicateFinder(root)
    root.mainloop()
