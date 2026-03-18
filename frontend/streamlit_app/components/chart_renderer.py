"""Chart renderer -- dispatches viz config to the appropriate Plotly/Streamlit chart."""

import streamlit as st
import plotly.express as px
import pandas as pd

_CHART_COLORS = ["#6C63FF", "#B794F6", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#14B8A6"]


_LAYOUT_DEFAULTS = dict(
    template="plotly_white",
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, sans-serif", color="#374151", size=13),
    title_font=dict(size=16, color="#1F2937"),
    margin=dict(l=40, r=20, t=50, b=40),
    xaxis=dict(gridcolor="#E5E7EB", zerolinecolor="#E5E7EB"),
    yaxis=dict(gridcolor="#E5E7EB", zerolinecolor="#E5E7EB"),
    colorway=_CHART_COLORS,
    hoverlabel=dict(bgcolor="#FFFFFF", bordercolor="#E5E7EB", font_color="#1F2937"),
)


def render_chart(viz_config: dict | None, results: list[dict]) -> None:
    """Render a chart based on the viz config and query results."""
    if not viz_config or not results:
        return

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


def _render_metric(df: pd.DataFrame, y_axis: str | None, title: str) -> None:
    """Render a styled metric card using custom HTML."""
    if y_axis and y_axis in df.columns:
        value = df[y_axis].iloc[0]
    else:
        for col in df.columns:
            try:
                value = pd.to_numeric(df[col].iloc[0])
                break
            except (ValueError, TypeError):
                continue
        else:
            value = df.iloc[0, 0]

    if isinstance(value, (int, float)):
        display_value = f"{value:,.2f}" if isinstance(value, float) else f"{value:,}"
    else:
        display_value = str(value)

    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-label">{title or "Result"}</div>
        <div class="metric-value">{display_value}</div>
    </div>
    """, unsafe_allow_html=True)


def _render_bar(df: pd.DataFrame, x_axis: str | None, y_axis: str | None, title: str) -> None:
    """Render a styled Plotly bar chart."""
    if not x_axis or not y_axis:
        return
    if x_axis not in df.columns or y_axis not in df.columns:
        return

    fig = px.bar(df, x=x_axis, y=y_axis, title=title)
    fig.update_traces(marker_color=_CHART_COLORS[0], marker_line_width=0)
    fig.update_layout(**_LAYOUT_DEFAULTS)
    fig.update_layout(
        xaxis_title=x_axis.replace("_", " ").title(),
        yaxis_title=y_axis.replace("_", " ").title(),
        bargap=0.25,
    )
    st.plotly_chart(fig, use_container_width=True)


def _render_line(df: pd.DataFrame, x_axis: str | None, y_axis: str | None, title: str) -> None:
    """Render a styled Plotly line chart."""
    if not x_axis or not y_axis:
        return
    if x_axis not in df.columns or y_axis not in df.columns:
        return

    fig = px.line(df, x=x_axis, y=y_axis, title=title, markers=True)
    fig.update_traces(
        line=dict(color=_CHART_COLORS[0], width=2.5),
        marker=dict(size=6, color=_CHART_COLORS[0], line=dict(width=1, color="#FFFFFF")),
        fill="tozeroy",
        fillcolor="rgba(108, 99, 255, 0.08)",
    )
    fig.update_layout(**_LAYOUT_DEFAULTS)
    fig.update_layout(
        xaxis_title=x_axis.replace("_", " ").title(),
        yaxis_title=y_axis.replace("_", " ").title(),
    )
    st.plotly_chart(fig, use_container_width=True)
