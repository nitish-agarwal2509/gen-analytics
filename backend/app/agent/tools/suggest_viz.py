"""Suggest visualization tool -- recommends chart type based on query result shape."""

import re

# Column name patterns for type detection
_DATE_PATTERNS = re.compile(
    r"(date|day|week|month|quarter|year|time|timestamp|created_at|updated_at|period)",
    re.IGNORECASE,
)
_CATEGORICAL_PATTERNS = re.compile(
    r"(name|type|status|category|region|city|state|country|tier|segment|channel|source|mode|platform|device|brand|group|label|id$)",
    re.IGNORECASE,
)


def _is_date_column(col_name: str) -> bool:
    return bool(_DATE_PATTERNS.search(col_name))


def _is_categorical_column(col_name: str) -> bool:
    return bool(_CATEGORICAL_PATTERNS.search(col_name))


def _is_numeric_column(col_name: str, sample_values: list | None = None) -> bool:
    """Heuristic: not date, not obviously categorical, or name suggests numeric."""
    if _is_date_column(col_name) or _is_categorical_column(col_name):
        return False
    numeric_hints = re.compile(
        r"(count|sum|avg|total|amount|revenue|cost|price|rate|percent|ratio|num|quantity|balance|volume|size|fee|commission|payout)",
        re.IGNORECASE,
    )
    return bool(numeric_hints.search(col_name))


def suggest_visualization(columns: list[str], row_count: int, query_intent: str = "") -> dict:
    """Suggest the best visualization type based on result columns and row count.

    Args:
        columns: List of column names from the query result.
        row_count: Number of rows returned.
        query_intent: Brief description of what the query calculates (e.g. "total revenue", "revenue by month").

    Returns:
        dict with keys: chart_type, x_axis, y_axis, title, reasoning
        chart_type is one of: metric_card, bar_chart, line_chart, table
    """
    if not columns or row_count == 0:
        return {
            "chart_type": "table",
            "x_axis": None,
            "y_axis": None,
            "title": query_intent or "Query Results",
            "reasoning": "No data to visualize.",
        }

    date_cols = [c for c in columns if _is_date_column(c)]
    cat_cols = [c for c in columns if _is_categorical_column(c)]
    num_cols = [c for c in columns if _is_numeric_column(c)]

    # Columns that didn't match any pattern -- treat as numeric if few, categorical if many
    classified = set(date_cols + cat_cols + num_cols)
    unclassified = [c for c in columns if c not in classified]
    # If only 1-2 columns total and one is unclassified, it's likely the numeric value
    if unclassified and len(columns) <= 3:
        num_cols.extend(unclassified)

    title = query_intent or "Query Results"

    # Rule 1: Single row with 1 numeric column -> metric card
    if row_count == 1 and len(columns) <= 2 and num_cols:
        return {
            "chart_type": "metric_card",
            "x_axis": None,
            "y_axis": num_cols[0],
            "title": title,
            "reasoning": f"Single value result -- displaying as metric card ({num_cols[0]}).",
        }

    # Rule 2: Date/time column + numeric -> line chart
    if date_cols and num_cols:
        return {
            "chart_type": "line_chart",
            "x_axis": date_cols[0],
            "y_axis": num_cols[0],
            "title": title,
            "reasoning": f"Time series data -- line chart with {date_cols[0]} on x-axis.",
        }

    # Rule 3: Categorical + numeric -> bar chart (up to 30 rows)
    if cat_cols and num_cols and row_count <= 30:
        return {
            "chart_type": "bar_chart",
            "x_axis": cat_cols[0],
            "y_axis": num_cols[0],
            "title": title,
            "reasoning": f"Categorical breakdown -- bar chart with {cat_cols[0]} on x-axis.",
        }

    # Rule 4: Too many rows for a chart, or too many columns -> table
    return {
        "chart_type": "table",
        "x_axis": None,
        "y_axis": None,
        "title": title,
        "reasoning": "Complex or large result set -- displaying as table.",
    }
