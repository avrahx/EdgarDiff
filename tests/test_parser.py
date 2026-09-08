"""Tests for SEC 10-K section parser and segmentation service."""

from bs4 import BeautifulSoup
import pytest

from backend.services.parser import (
    clean_section_text,
    extract_10k_sections,
    table_to_markdown,
    _extract_with_heuristic_fallback,
)


@pytest.fixture
def sample_10k_html() -> str:
    """Realistic 10-K HTML fixture containing a TOC, XBRL inline tags, tables, and sections."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sample Corp 10-K</title>
        <style>body { font-family: Arial; }</style>
    </head>
    <body>
        <!-- Table of Contents -->
        <div>
            <h2>Table of Contents</h2>
            <table>
                <tr><th>Item</th><th>Description</th><th>Page</th></tr>
                <tr><td>Item 1A.</td><td><a href="#item1a">Risk Factors</a></td><td>15</td></tr>
                <tr><td>Item 1B.</td><td><a href="#item1b">Unresolved Staff Comments</a></td><td>28</td></tr>
                <tr><td>Item 7.</td><td><a href="#item7">Management's Discussion and Analysis</a></td><td>35</td></tr>
                <tr><td>Item 8.</td><td><a href="#item8">Financial Statements</a></td><td>60</td></tr>
            </table>
        </div>
        <hr/>

        <!-- Item 1A: Risk Factors -->
        <div id="item1a">
            <p><b>ITEM 1A. RISK FACTORS</b></p>
            <p>Investing in our securities involves significant risks. You should carefully consider the risks described below.</p>
            <ix:nonNumeric contextRef="c1" name="RiskFactor1">
                Our global supply chain is subject to geopolitical disruption and port delays.
            </ix:nonNumeric>
            <p>The following table summarizes our principal categories of operational risk:</p>
            <table>
                <tr><th>Risk Category</th><th>Impact Severity</th><th>Likelihood</th></tr>
                <tr><td>Supply Chain Disruption</td><td>High</td><td>Medium</td></tr>
                <tr><td>Cybersecurity Breach</td><td>Critical</td><td>Low</td></tr>
                <tr><td>Regulatory Shift</td><td>Medium</td><td>High</td></tr>
            </table>
            <p>Additionally, volatility in raw material costs may compress operating margins across all operating segments.</p>
            <p>Page 15</p>
        </div>

        <!-- Item 1B: Delimiter -->
        <div id="item1b">
            <p><b>ITEM 1B. UNRESOLVED STAFF COMMENTS</b></p>
            <p>There are no unresolved comments received from the SEC staff.</p>
            <p>Page 28</p>
        </div>

        <!-- Item 7: MD&A -->
        <div id="item7">
            <p><b>ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS OF FINANCIAL CONDITION AND RESULTS OF OPERATIONS</b></p>
            <p>The following discussion should be read together with our audited consolidated financial statements.</p>
            <p>During the fiscal year ended December 31, 2023, consolidated net revenue expanded by 14.2% to $1.25 billion.</p>
            <table>
                <tr><th>Operating Segment</th><th>2023 Revenue</th><th>2022 Revenue</th><th>Growth %</th></tr>
                <tr><td>Enterprise Software</td><td>$850M</td><td>$720M</td><td>+18.1%</td></tr>
                <tr><td>Professional Services</td><td>$400M</td><td>$375M</td><td>+6.7%</td></tr>
            </table>
            <p>Free cash flow generated from operating activities totaled $320 million compared to $280 million in the prior period.</p>
            <p>Page 35</p>
        </div>

        <!-- Item 7A: Delimiter -->
        <div id="item7a">
            <p><b>ITEM 7A. QUANTITATIVE AND QUALITATIVE DISCLOSURES ABOUT MARKET RISK</b></p>
            <p>We are subject to market risks relating to interest rates and foreign currency fluctuations.</p>
        </div>

        <!-- Item 8: Financial Statements -->
        <div id="item8">
            <p><b>ITEM 8. FINANCIAL STATEMENTS AND SUPPLEMENTARY DATA</b></p>
            <p>Report of Independent Registered Public Accounting Firm to the Shareholders and Board of Directors.</p>
            <table>
                <tr><th>Consolidated Statement of Operations</th><th>2023</th><th>2022</th></tr>
                <tr><td>Total Revenues</td><td>$1,250,000</td><td>$1,095,000</td></tr>
                <tr><td>Cost of Goods Sold</td><td>$520,000</td><td>$460,000</td></tr>
                <tr><td>Operating Income</td><td>$340,000</td><td>$295,000</td></tr>
            </table>
            <p>The accompanying notes are an integral part of these consolidated financial statements.</p>
            <p>Page 60</p>
        </div>

        <!-- Item 9: Delimiter -->
        <div id="item9">
            <p><b>ITEM 9. CHANGES IN AND DISAGREEMENTS WITH ACCOUNTANTS ON ACCOUNTING AND FINANCIAL DISCLOSURE</b></p>
            <p>None.</p>
        </div>
    </body>
    </html>
    """


@pytest.fixture
def legacy_10k_html() -> str:
    """Legacy/non-standard HTML format using archaic tags without modern semantic classes."""
    return """
    <html>
    <body>
        <font size="4"><b>ITEM 1A. RISK FACTORS</b></font>
        <br><br>
        <font size="2">
        Our enterprise operations are subject to critical operational uncertainties.
        Any deterioration in macroeconomic conditions could harm our quarterly financial outlook.
        Technological obsolescence and unexpected patent disputes may impair research pipelines.
        </font>
        <br><br>
        <font size="4"><b>ITEM 1B. UNRESOLVED STAFF COMMENTS</b></font>
        <br>
        <font size="2">None reported.</font>
        <br><br>
        <font size="4"><b>ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS</b></font>
        <br><br>
        <font size="2">
        Management analyzes financial performance across geographic units.
        Gross margin broadened 210 basis points due to manufacturing efficiencies.
        Capital expenditures reached $95 million primarily for server infrastructure expansion.
        </font>
        <br><br>
        <font size="4"><b>ITEM 7A. MARKET RISK</b></font>
        <br>
        <font size="2">Currency hedging minimized exposure.</font>
        <br><br>
        <font size="4"><b>ITEM 8. FINANCIAL STATEMENTS</b></font>
        <br><br>
        <font size="2">
        Consolidated Balance Sheets as of December 31, 2023 and 2022 indicate total assets of $2.4 billion.
        Cash and cash equivalents were $410 million.
        </font>
        <br><br>
        <font size="4"><b>ITEM 9. CONTROLS AND PROCEDURES</b></font>
    </body>
    </html>
    """


class TestExtract10KSections:
    def test_extract_10k_sections_not_empty_or_truncated(self, sample_10k_html: str):
        sections = extract_10k_sections(sample_10k_html)

        # Ensure all three target keys are present
        assert set(sections.keys()) == {"item_1a", "item_7", "item_8"}

        # Item 1A validations
        item_1a = sections["item_1a"]
        assert len(item_1a) > 0, "Item 1A must not be empty"
        assert "ITEM 1A. RISK FACTORS" in item_1a
        assert "Investing in our securities involves significant risks" in item_1a
        assert "Our global supply chain is subject to geopolitical disruption" in item_1a
        assert "volatility in raw material costs may compress operating margins" in item_1a
        # Ensure Item 1B content did not leak into Item 1A
        assert "There are no unresolved comments received from the SEC" not in item_1a

        # Item 7 (MD&A) validations
        item_7 = sections["item_7"]
        assert len(item_7) > 0, "Item 7 must not be empty"
        assert "MANAGEMENT'S DISCUSSION AND ANALYSIS" in item_7
        assert "audited consolidated financial statements" in item_7
        assert "During the fiscal year ended December 31, 2023" in item_7
        assert "Free cash flow generated from operating activities" in item_7
        # Ensure Item 7A content did not leak into Item 7
        assert "We are subject to market risks relating to interest rates" not in item_7

        # Item 8 validations
        item_8 = sections["item_8"]
        assert len(item_8) > 0, "Item 8 must not be empty"
        assert "FINANCIAL STATEMENTS AND SUPPLEMENTARY DATA" in item_8
        assert "Report of Independent Registered Public Accounting Firm" in item_8

    def test_markdown_tables_preserved(self, sample_10k_html: str):
        sections = extract_10k_sections(sample_10k_html)

        # Check Item 1A table formatted as Markdown table
        item_1a = sections["item_1a"]
        assert "| Risk Category | Impact Severity | Likelihood |" in item_1a
        assert "| --- | --- | --- |" in item_1a
        assert "| Supply Chain Disruption | High | Medium |" in item_1a
        assert "| Cybersecurity Breach | Critical | Low |" in item_1a

        # Check Item 7 table formatted as Markdown table
        item_7 = sections["item_7"]
        assert "| Operating Segment | 2023 Revenue | 2022 Revenue | Growth % |" in item_7
        assert "| Enterprise Software | $850M | $720M | +18.1% |" in item_7

        # Check Item 8 table
        item_8 = sections["item_8"]
        assert "| Consolidated Statement of Operations | 2023 | 2022 |" in item_8
        assert "| Total Revenues | $1,250,000 | $1,095,000 |" in item_8

    def test_raw_xbrl_tags_stripped_and_text_preserved(self, sample_10k_html: str):
        sections = extract_10k_sections(sample_10k_html)
        item_1a = sections["item_1a"]

        # Raw tags must not be present
        assert "<ix:nonNumeric" not in item_1a
        assert "</ix:nonNumeric>" not in item_1a
        assert "contextRef=" not in item_1a

        # The inner text must be preserved
        assert "Our global supply chain is subject to geopolitical disruption" in item_1a

    def test_page_numbers_stripped(self, sample_10k_html: str):
        sections = extract_10k_sections(sample_10k_html)
        for key, text in sections.items():
            # Verify standalone page markers are stripped
            lines = [line.strip() for line in text.splitlines()]
            assert "Page 15" not in lines
            assert "Page 35" not in lines
            assert "Page 60" not in lines

    def test_toc_not_extracted_as_section(self, sample_10k_html: str):
        sections = extract_10k_sections(sample_10k_html)
        # Verify the TOC table rows themselves are not mistaken for the section
        assert "Table of Contents" not in sections["item_1a"]
        assert "href=" not in sections["item_1a"]


class TestFallbackParser:
    def test_fallback_parser_on_legacy_html(self, legacy_10k_html: str):
        sections = extract_10k_sections(legacy_10k_html)

        # All sections should be extracted even on legacy font-tag HTML
        assert len(sections["item_1a"]) > 0
        assert "Our enterprise operations are subject to critical operational uncertainties" in sections["item_1a"]
        assert "Technological obsolescence and unexpected patent disputes" in sections["item_1a"]

        assert len(sections["item_7"]) > 0
        assert "Management analyzes financial performance across geographic units" in sections["item_7"]
        assert "Capital expenditures reached $95 million" in sections["item_7"]

        assert len(sections["item_8"]) > 0
        assert "Consolidated Balance Sheets as of December 31, 2023" in sections["item_8"]

    def test_direct_heuristic_fallback(self, legacy_10k_html: str):
        soup = BeautifulSoup(legacy_10k_html, "html.parser")
        sections = _extract_with_heuristic_fallback(soup)
        assert len(sections["item_1a"]) > 0
        assert len(sections["item_7"]) > 0
        assert len(sections["item_8"]) > 0


class TestTableToMarkdownHelper:
    def test_table_to_markdown_formatting(self):
        html_table = """
        <table>
            <tr><th>Metric</th><th>2023</th><th>2022</th></tr>
            <tr><td>Net Income</td><td>$50M</td><td>$42M</td></tr>
            <tr><td>EPS | Diluted</td><td>$2.50</td><td>$2.10</td></tr>
        </table>
        """
        soup = BeautifulSoup(html_table, "html.parser")
        table_tag = soup.find("table")
        md = table_to_markdown(table_tag)

        assert "| Metric | 2023 | 2022 |" in md
        assert "| --- | --- | --- |" in md
        assert "| Net Income | $50M | $42M |" in md
        assert r"EPS \| Diluted" in md

    def test_empty_table(self):
        soup = BeautifulSoup("<table></table>", "html.parser")
        assert table_to_markdown(soup.find("table")) == ""


class TestCleanSectionText:
    def test_strips_page_numbers_and_collapses_newlines(self):
        raw = "Item 1A.\n\n\nPage 25\n\nSome risk statement.\n\n- 26 -\n\nAnother statement.\n\n\n\nFinal note."
        cleaned = clean_section_text(raw)
        assert "Page 25" not in cleaned
        assert "- 26 -" not in cleaned
        assert "\n\n\n" not in cleaned
        assert "Some risk statement." in cleaned
        assert "Another statement." in cleaned


class TestEdgeCases:
    def test_empty_input(self):
        sections = extract_10k_sections("")
        assert sections == {"item_1a": "", "item_7": "", "item_8": ""}

    def test_whitespace_input(self):
        sections = extract_10k_sections("   \n\t  ")
        assert sections == {"item_1a": "", "item_7": "", "item_8": ""}
