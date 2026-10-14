"""
Portal Review Collector - Modern Desktop GUI (CustomTkinter)
Interactive dashboard for scraping Naver, Kakao, and Google reviews with live logs, stats, and Excel export.
"""
import os
import sys
import threading
import asyncio
import subprocess
from datetime import datetime
from typing import Dict, Any, List

import customtkinter as ctk
from tkinter import ttk, messagebox

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from collector_service import CollectorService

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")


class ReviewCollectorApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("🌐 3대 포털(네이버·카카오·구글) 리뷰 수집기 ver 1.0")
        self.geometry("1100x820")
        self.minsize(980, 750)

        self.service = CollectorService(
            log_callback=self.append_log,
            progress_callback=self.update_progress
        )
        self.is_running = False
        self.last_results = None

        self._build_ui()

    def _build_ui(self):
        # 1. Header Frame
        header_frame = ctk.CTkFrame(self, corner_radius=10, fg_color=("#1E293B", "#0F172A"))
        header_frame.pack(fill="x", padx=16, pady=(14, 8))

        title_label = ctk.CTkLabel(
            header_frame,
            text="🌐 3대 포털(네이버 플레이스 · 카카오맵 · 구글 지도) 리뷰 수집기",
            font=ctk.CTkFont(family="맑은 고딕", size=20, weight="bold"),
            text_color="#38BDF8"
        )
        title_label.pack(side="left", padx=18, pady=12)

        theme_switch = ctk.CTkSwitch(
            header_frame,
            text="다크 모드",
            command=self._toggle_theme,
            font=ctk.CTkFont(family="맑은 고딕", size=12)
        )
        theme_switch.select()
        theme_switch.pack(side="right", padx=18, pady=12)

        # 2. Main Tabview (Input Modes)
        self.tabview = ctk.CTkTabview(self, corner_radius=10)
        self.tabview.pack(fill="x", padx=16, pady=6)

        tab_link = self.tabview.add("🔗 직접 링크 입력 수집")
        tab_search = self.tabview.add("🔍 사업장명 통합 검색 수집")

        # --- Tab 1: Links ---
        # Naver Link
        ctk.CTkLabel(tab_link, text="🟢 네이버 플레이스 링크 (또는 장소 ID):", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold")).grid(row=0, column=0, sticky="w", padx=10, pady=(6, 2))
        self.entry_naver = ctk.CTkEntry(tab_link, placeholder_text="예: https://m.place.naver.com/place/1086067689/home 또는 naver.me/xxx", width=750)
        self.entry_naver.grid(row=1, column=0, columnspan=2, sticky="we", padx=10, pady=(0, 6))

        # Kakao Link
        ctk.CTkLabel(tab_link, text="🟡 다음 / 카카오맵 링크 (또는 장소 ID):", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold")).grid(row=2, column=0, sticky="w", padx=10, pady=(6, 2))
        self.entry_kakao = ctk.CTkEntry(tab_link, placeholder_text="예: https://place.map.kakao.com/35026031 또는 kko.to/xxx", width=750)
        self.entry_kakao.grid(row=3, column=0, columnspan=2, sticky="we", padx=10, pady=(0, 6))

        # Google Link
        ctk.CTkLabel(tab_link, text="🔵 구글 지도 링크 (또는 검색어):", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold")).grid(row=4, column=0, sticky="w", padx=10, pady=(6, 2))
        self.entry_google = ctk.CTkEntry(tab_link, placeholder_text="예: https://www.google.com/maps/place/... 또는 maps.app.goo.gl/xxx", width=750)
        self.entry_google.grid(row=5, column=0, columnspan=2, sticky="we", padx=10, pady=(0, 8))

        # Example auto-fill button
        btn_example = ctk.CTkButton(tab_link, text="💡 테스트 예시 링크 자동 채우기", command=self._fill_example_links, fg_color="#334155", hover_color="#475569", width=220)
        btn_example.grid(row=6, column=0, sticky="w", padx=10, pady=(0, 6))

        tab_link.columnconfigure(0, weight=1)

        # --- Tab 2: Search Query ---
        ctk.CTkLabel(tab_search, text="사업장 상호명 및 지역 (검색어):", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold")).grid(row=0, column=0, sticky="w", padx=10, pady=(8, 2))
        self.entry_query = ctk.CTkEntry(tab_search, placeholder_text="예: 스타벅스 강남R점 또는 연세세브란스병원", width=750)
        self.entry_query.grid(row=1, column=0, columnspan=3, sticky="we", padx=10, pady=(0, 10))

        ctk.CTkLabel(tab_search, text="수집 대상 포털 선택:", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold")).grid(row=2, column=0, sticky="w", padx=10, pady=(0, 4))
        self.chk_naver = ctk.CTkCheckBox(tab_search, text="네이버 플레이스", fg_color="#03C75A")
        self.chk_naver.select()
        self.chk_naver.grid(row=3, column=0, sticky="w", padx=10, pady=4)

        self.chk_kakao = ctk.CTkCheckBox(tab_search, text="다음 / 카카오맵", fg_color="#EAB308")
        self.chk_kakao.select()
        self.chk_kakao.grid(row=3, column=1, sticky="w", padx=10, pady=4)

        self.chk_google = ctk.CTkCheckBox(tab_search, text="구글 지도", fg_color="#3B82F6")
        self.chk_google.select()
        self.chk_google.grid(row=3, column=2, sticky="w", padx=10, pady=4)

        tab_search.columnconfigure(0, weight=1)

        # 3. Control Panel (Max Reviews & Start Buttons)
        ctrl_frame = ctk.CTkFrame(self, corner_radius=10)
        ctrl_frame.pack(fill="x", padx=16, pady=4)

        ctk.CTkLabel(ctrl_frame, text="포털당 최대 수집 건수:", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold")).pack(side="left", padx=(14, 6), pady=10)
        self.combo_max = ctk.CTkComboBox(ctrl_frame, values=["10", "20", "30", "50", "100"], width=90)
        self.combo_max.set("30")
        self.combo_max.pack(side="left", padx=6, pady=10)

        self.btn_start = ctk.CTkButton(
            ctrl_frame,
            text="🚀 리뷰 수집 시작",
            font=ctk.CTkFont(family="맑은 고딕", size=14, weight="bold"),
            fg_color="#0284C7",
            hover_color="#0369A1",
            command=self._start_collection,
            width=160
        )
        self.btn_start.pack(side="left", padx=16, pady=10)

        self.btn_open_excel = ctk.CTkButton(
            ctrl_frame,
            text="📊 엑셀 리포트 열기",
            state="disabled",
            fg_color="#10B981",
            hover_color="#059669",
            command=self._open_excel_report,
            width=150
        )
        self.btn_open_excel.pack(side="right", padx=12, pady=10)

        self.btn_open_dir = ctk.CTkButton(
            ctrl_frame,
            text="📂 결과 폴더 열기",
            fg_color="#475569",
            hover_color="#334155",
            command=self._open_output_dir,
            width=130
        )
        self.btn_open_dir.pack(side="right", padx=6, pady=10)

        # 4. Progress Bar & Status
        prog_frame = ctk.CTkFrame(self, fg_color="transparent")
        prog_frame.pack(fill="x", padx=16, pady=(4, 2))

        self.lbl_status = ctk.CTkLabel(prog_frame, text="대기 중 - 포털 링크를 입력하거나 사업장명을 검색하세요.", font=ctk.CTkFont(family="맑은 고딕", size=12))
        self.lbl_status.pack(side="left", padx=4)

        self.progress_bar = ctk.CTkProgressBar(self, orientation="horizontal", height=10)
        self.progress_bar.set(0)
        self.progress_bar.pack(fill="x", padx=16, pady=(0, 6))

        # 5. Middle Split (Stats Summary & Live Logs)
        mid_frame = ctk.CTkFrame(self, corner_radius=10)
        mid_frame.pack(fill="both", expand=True, padx=16, pady=4)

        # Left: Live Log
        log_frame = ctk.CTkFrame(mid_frame, fg_color="transparent")
        log_frame.pack(side="left", fill="both", expand=True, padx=8, pady=8)

        ctk.CTkLabel(log_frame, text="📝 실시간 수집 로그", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold")).pack(anchor="w")
        self.txt_log = ctk.CTkTextbox(log_frame, font=ctk.CTkFont(family="Consolas", size=11), wrap="word")
        self.txt_log.pack(fill="both", expand=True, pady=(4, 0))

        # Right: Stats Panel
        stats_frame = ctk.CTkFrame(mid_frame, width=280, corner_radius=8, fg_color=("#F1F5F9", "#1E293B"))
        stats_frame.pack(side="right", fill="y", padx=8, pady=8)

        ctk.CTkLabel(stats_frame, text="📊 수집 통계 요약", font=ctk.CTkFont(family="맑은 고딕", size=14, weight="bold"), text_color="#38BDF8").pack(pady=(10, 8))

        self.lbl_total_cnt = ctk.CTkLabel(stats_frame, text="총 수집 리뷰: 0건", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold"))
        self.lbl_total_cnt.pack(anchor="w", padx=16, pady=4)

        self.lbl_naver_cnt = ctk.CTkLabel(stats_frame, text="🟢 네이버: 0건 (평점: -)", font=ctk.CTkFont(family="맑은 고딕", size=12))
        self.lbl_naver_cnt.pack(anchor="w", padx=16, pady=3)

        self.lbl_kakao_cnt = ctk.CTkLabel(stats_frame, text="🟡 카카오: 0건 (평점: -)", font=ctk.CTkFont(family="맑은 고딕", size=12))
        self.lbl_kakao_cnt.pack(anchor="w", padx=16, pady=3)

        self.lbl_google_cnt = ctk.CTkLabel(stats_frame, text="🔵 구글: 0건 (평점: -)", font=ctk.CTkFont(family="맑은 고딕", size=12))
        self.lbl_google_cnt.pack(anchor="w", padx=16, pady=3)

        self.lbl_overall_rate = ctk.CTkLabel(stats_frame, text="⭐ 전체 평균 평점: - / 5.0", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold"), text_color="#FBBF24")
        self.lbl_overall_rate.pack(anchor="w", padx=16, pady=(10, 4))

        self.lbl_sentiment = ctk.CTkLabel(stats_frame, text="😊 긍정 비율: - %", font=ctk.CTkFont(family="맑은 고딕", size=12))
        self.lbl_sentiment.pack(anchor="w", padx=16, pady=3)

        # 6. Bottom Table Preview (Treeview)
        table_frame = ctk.CTkFrame(self, corner_radius=10, height=180)
        table_frame.pack(fill="x", padx=16, pady=(4, 12))

        ctk.CTkLabel(table_frame, text="📋 수집된 리뷰 미리보기 (최신 순)", font=ctk.CTkFont(family="맑은 고딕", size=13, weight="bold")).pack(anchor="w", padx=10, pady=(6, 2))

        style = ttk.Style()
        style.theme_use("clam")
        style.configure("Treeview", font=("맑은 고딕", 9), rowheight=24)
        style.configure("Treeview.Heading", font=("맑은 고딕", 10, "bold"))

        cols = ("portal", "author", "rating", "date", "verification", "content")
        self.tree = ttk.Treeview(table_frame, columns=cols, show="headings", height=5)
        self.tree.heading("portal", text="포털")
        self.tree.heading("author", text="작성자")
        self.tree.heading("rating", text="별점")
        self.tree.heading("date", text="방문/작성일")
        self.tree.heading("verification", text="인증유형")
        self.tree.heading("content", text="리뷰 내용")

        self.tree.column("portal", width=70, anchor="center")
        self.tree.column("author", width=120, anchor="w")
        self.tree.column("rating", width=60, anchor="center")
        self.tree.column("date", width=100, anchor="center")
        self.tree.column("verification", width=100, anchor="center")
        self.tree.column("content", width=550, anchor="w")

        tree_scroll = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=tree_scroll.set)

        self.tree.pack(side="left", fill="both", expand=True, padx=(10, 0), pady=(0, 8))
        tree_scroll.pack(side="right", fill="y", padx=(0, 10), pady=(0, 8))

    def _fill_example_links(self):
        """Pre-fills real verified example links for immediate testing."""
        self.entry_naver.delete(0, "end")
        self.entry_naver.insert(0, "https://m.place.naver.com/place/1086067689/review/visitor")

        self.entry_kakao.delete(0, "end")
        self.entry_kakao.insert(0, "https://place.map.kakao.com/35026031")

        self.entry_google.delete(0, "end")
        self.entry_google.insert(0, "https://www.google.com/maps/search/스타벅스+강남R점")

        self.append_log("💡 스타벅스 강남R점 3대 포털 실검증 예시 링크가 입력되었습니다.")

    def _toggle_theme(self):
        mode = ctk.get_appearance_mode()
        ctk.set_appearance_mode("Light" if mode == "Dark" else "Dark")

    def append_log(self, msg: str):
        self.after(0, self._append_log_threadsafe, msg)

    def _append_log_threadsafe(self, msg: str):
        self.txt_log.insert("end", msg + "\n")
        self.txt_log.see("end")

    def update_progress(self, pct: float, msg: str):
        self.after(0, self._update_progress_threadsafe, pct, msg)

    def _update_progress_threadsafe(self, pct: float, msg: str):
        self.progress_bar.set(pct / 100.0)
        self.lbl_status.configure(text=f"[{int(pct)}%] {msg}")

    def _start_collection(self):
        if self.is_running:
            return

        selected_tab = self.tabview.get()
        max_r_str = self.combo_max.get()
        max_r = int(max_r_str) if max_r_str.isdigit() else 30

        self.is_running = True
        self.btn_start.configure(state="disabled", text="⏳ 수집 진행 중...")
        self.btn_open_excel.configure(state="disabled")

        # Clear previous tree rows
        for item in self.tree.get_children():
            self.tree.delete(item)

        thread = threading.Thread(target=self._run_collector_thread, args=(selected_tab, max_r), daemon=True)
        thread.start()

    def _run_collector_thread(self, selected_tab: str, max_r: int):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            if "링크" in selected_tab:
                n_url = self.entry_naver.get().strip()
                k_url = self.entry_kakao.get().strip()
                g_url = self.entry_google.get().strip()
                res = loop.run_until_complete(
                    self.service.collect_by_urls(naver_url=n_url, kakao_url=k_url, google_url=g_url, max_reviews_per_portal=max_r)
                )
            else:
                query = self.entry_query.get().strip()
                portals = []
                if self.chk_naver.get():
                    portals.append("Naver")
                if self.chk_kakao.get():
                    portals.append("Kakao")
                if self.chk_google.get():
                    portals.append("Google")
                res = loop.run_until_complete(
                    self.service.collect_by_query(business_name=query, portals=portals, max_reviews_per_portal=max_r)
                )

            self.last_results = res
            self.after(0, self._on_collection_complete, res)
        except Exception as e:
            self.append_log(f"❌ 수집 중단 오류: {e}")
            self.after(0, self._on_collection_error, str(e))
        finally:
            loop.close()

    def _on_collection_complete(self, results: Dict[str, Any]):
        self.is_running = False
        self.btn_start.configure(state="normal", text="🚀 리뷰 수집 시작")
        self.btn_open_excel.configure(state="normal")

        reviews = results.get("reviews", [])
        analysis = results.get("analysis", {})

        # Populate treeview
        for r in reviews:
            self.tree.insert("", "end", values=(
                r.get("portal", ""),
                r.get("author", ""),
                r.get("rating", "-"),
                r.get("date", ""),
                r.get("verification", ""),
                r.get("content", "").replace("\n", " ")[:80]
            ))

        # Update stats
        self.lbl_total_cnt.configure(text=f"총 수집 리뷰: {analysis.get('total_count', 0)}건")
        
        n_cnt = analysis.get("portal_breakdown", {}).get("Naver", 0)
        n_avg = analysis.get("average_ratings", {}).get("Naver", "-")
        self.lbl_naver_cnt.configure(text=f"🟢 네이버: {n_cnt}건 (평점: {n_avg})")

        k_cnt = analysis.get("portal_breakdown", {}).get("Kakao", 0)
        k_avg = analysis.get("average_ratings", {}).get("Kakao", "-")
        self.lbl_kakao_cnt.configure(text=f"🟡 카카오: {k_cnt}건 (평점: {k_avg})")

        g_cnt = analysis.get("portal_breakdown", {}).get("Google", 0)
        g_avg = analysis.get("average_ratings", {}).get("Google", "-")
        self.lbl_google_cnt.configure(text=f"🔵 구글: {g_cnt}건 (평점: {g_avg})")

        self.lbl_overall_rate.configure(text=f"⭐ 전체 평균 평점: {analysis.get('overall_average', 0.0)} / 5.0")
        
        ratio = analysis.get("sentiment", {}).get("sentiment_ratio", 50.0)
        self.lbl_sentiment.configure(text=f"😊 긍정 키워드 비율: {ratio}%")

        messagebox.showinfo("수집 완료", f"총 {len(reviews)}건의 리뷰를 성공적으로 수집 및 엑셀로 저장하였습니다.")

    def _on_collection_error(self, err_msg: str):
        self.is_running = False
        self.btn_start.configure(state="normal", text="🚀 리뷰 수집 시작")
        messagebox.showerror("수집 오류", f"수집 도중 오류가 발생했습니다:\n{err_msg}")

    def _open_excel_report(self):
        if self.last_results and "reports" in self.last_results:
            excel_path = self.last_results["reports"].get("excel")
            if excel_path and os.path.exists(excel_path):
                os.startfile(excel_path)
                return
        messagebox.showwarning("안내", "생성된 엑셀 리포트가 없습니다.")

    def _open_output_dir(self):
        out_dir = os.path.join(os.getcwd(), "output_reports")
        os.makedirs(out_dir, exist_ok=True)
        os.startfile(out_dir)


def main():
    app = ReviewCollectorApp()
    app.mainloop()


if __name__ == "__main__":
    main()
