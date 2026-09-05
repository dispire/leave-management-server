import os
import shutil
import tempfile
import unittest
from app_gui import AuthorDuplicateFinder

class TestAuthorDuplicateFinder(unittest.TestCase):
    def setUp(self):
        # 테스트용 임시 디렉터리 2개 생성
        self.temp_dir_a = tempfile.mkdtemp(prefix="test_dir_a_")
        self.temp_dir_b = tempfile.mkdtemp(prefix="test_dir_b_")

        # 폴더 A 샘플 파일 생성
        # [홍길동] 2개, [이순신] 1개, [강감찬] 1개, 대괄호 없는 파일 1개
        files_a = [
            "[홍길동] 조선시대 이야기 1권.pdf",
            "[홍길동] 조선시대 이야기 2권.pdf",
            "[이순신] 난중일기.txt",
            "[강감찬] 귀주대첩기.docx",
            "일반문서_작가없음.txt"
        ]
        for f in files_a:
            with open(os.path.join(self.temp_dir_a, f), "w", encoding="utf-8") as fp:
                fp.write("sample content")

        # 폴더 A 하위 폴더 및 파일 생성
        sub_dir_a = os.path.join(self.temp_dir_a, "subfolder")
        os.makedirs(sub_dir_a, exist_ok=True)
        with open(os.path.join(sub_dir_a, "[유관순] 독립운동사.txt"), "w", encoding="utf-8") as fp:
            fp.write("sample sub content")

        # 폴더 B 샘플 파일 생성
        # [홍길동] 1개, [이순신] 2개, [신사임당] 1개
        files_b = [
            "[홍길동] 홍길동전 전집.epub",
            "[이순신] 한산도 수군기 1.pdf",
            "[이순신] 한산도 수군기 2.pdf",
            "[신사임당] 초충도 갤러리.png"
        ]
        for f in files_b:
            with open(os.path.join(self.temp_dir_b, f), "w", encoding="utf-8") as fp:
                fp.write("sample content")

    def tearDown(self):
        shutil.rmtree(self.temp_dir_a, ignore_errors=True)
        shutil.rmtree(self.temp_dir_b, ignore_errors=True)

    def test_extract_author(self):
        self.assertEqual(AuthorDuplicateFinder.extract_author("[홍길동] 소설.txt"), "홍길동")
        self.assertEqual(AuthorDuplicateFinder.extract_author("  [이순신]  일기.pdf"), None)  # 맨 앞이 아니므로 None
        self.assertEqual(AuthorDuplicateFinder.extract_author("[  김유신  ] 화랑관.doc"), "김유신")
        self.assertIsNone(AuthorDuplicateFinder.extract_author("대괄호없는파일.txt"))

    def test_scan_and_compare_non_recursive(self):
        finder = AuthorDuplicateFinder.__new__(AuthorDuplicateFinder)
        map_a = finder._scan_folder(self.temp_dir_a, recursive=False)
        map_b = finder._scan_folder(self.temp_dir_b, recursive=False)

        # 폴더 A 검증: 홍길동(2개), 이순신(1개), 강감찬(1개) -> 총 3명 작가
        self.assertIn("홍길동", map_a)
        self.assertEqual(len(map_a["홍길동"]), 2)
        self.assertIn("이순신", map_a)
        self.assertEqual(len(map_a["이순신"]), 1)
        self.assertIn("강감찬", map_a)
        self.assertNotIn("유관순", map_a)  # 하위 폴더이므로 미포함

        # 폴더 B 검증: 홍길동(1개), 이순신(2개), 신사임당(1개)
        self.assertIn("홍길동", map_b)
        self.assertEqual(len(map_b["홍길동"]), 1)
        self.assertIn("이순신", map_b)
        self.assertEqual(len(map_b["이순신"]), 2)

        # 교집합 검증: 홍길동, 이순신 (총 2명)
        common = sorted(list(set(map_a.keys()) & set(map_b.keys())))
        self.assertEqual(common, ["이순신", "홍길동"])

    def test_scan_recursive(self):
        finder = AuthorDuplicateFinder.__new__(AuthorDuplicateFinder)
        map_a = finder._scan_folder(self.temp_dir_a, recursive=True)
        # 하위 폴더 유관순 포함 확인
        self.assertIn("유관순", map_a)
        self.assertEqual(len(map_a["유관순"]), 1)

if __name__ == "__main__":
    unittest.main()
