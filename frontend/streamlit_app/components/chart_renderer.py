"""Chart renderer -- dispatches viz config to the appropriate Plotly/Streamlit chart."""

import streamlit as st
import plotly.express as px
import pandas as pd


def render_chart(viz_config: dict | None, results: list[dict]) -> None:
    """Render a chart based on the viz config and query results.

    Args:
        viz_config: Output from suggest_visualization tool. None means no viz.
        results: List of result dicts from execute_sql (each has "rows", "columns").
    """
    if not viz_config or not results:
        return

    # Get the first result set with actual rows
    rows = None
    for r in results:
        if r.get("rows"):
            rows = r["rows"]
            break
    if not rows:
        return

    df = pd.DataFrame(rows)
    chart_type = viz_config.get("chart_type", "table")
    title = viz_config.get("title", "")
    x_axis = viz_config.get("x_axis")
    y_axis = viz_config.get("y_axis")

    if chart_type == "metric_card":
        _render_metric(df, y_axis, title)
    elif chart_type == "bar_chart":
        _render_bar(df, x_axis, y_axis, title)
    elif chart_type == "line_chart":
        _render_line(df, x_axis, y_axis, title)
    # table is the default -- handled by existing st.dataframe in _render_assistant_message


def _render_metric(df: pd.DataFrame, y_axis: str | None, title: str) -> None:
    """Render a single large metric value."""
    if y_axis and y_axis in df.columns:
        value = df[y_axis].iloc[0]
    else:
        # Fallback: first numeric-looking column
        for col in df.columns:
            try:
                value = pd.to_numeric(df[col].iloc[0])
                break
            except (ValueError, TypeError):
                continue
        else:
            value = df.iloc[0, 0]

    # Format large numbers with commas
    if isinstance(value, (int, float)):
        display_value = f"{value:,.2f}" if isinstance(value, float) else f"{value:,}"
    else:
        display_value = str(value)

    st.metric(label=title or "Result", value=display_value)


def _render_bar(df: pd.DataFrame, x_axis: str | None, y_axis: str | None, title: str) -> None:
    """Render a Plotly bar chart."""
    if not x_axis or not y_axis:
        return
    if x_axis not in df.columns or y_axis not in df.columns:
        return

    fig = px.bar(df, x=x_axis, y=y_axis, title=title)
    fig.update_layout(xaxis_title=x_axis, yaxis_title=y_axis)
    st.plotly_chart(fig, use_container_width=True)


def _render_line(df: pd.DataFrame, x_axis: str | None, y_axis: str | None, title: str) -> None:
    """Render a Plotly line chart."""
    if not x_axis or not y_axis:
        return
    if x_axis not in df.columns or y_axis not in df.columns:
        return

    fig = px.line(df, x=x_axis, y=y_axis, title=title, markers=True)
    fig.update_layout(xaxis_title=x_axis, yaxis_title=y_axis)
    st.plotly_chart(fig, use_container_width=True)
