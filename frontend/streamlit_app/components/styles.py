"""Custom CSS styles for GenAnalytics UI -- light theme."""

import streamlit as st


def inject_custom_css():
    """Inject custom CSS for a clean light theme."""
    st.markdown("""
    <style>
    /* ---- Global ---- */
    .stApp {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* ---- Header area ---- */
    .app-header {
        text-align: center;
        padding: 1.5rem 0 0.5rem 0;
    }
    .app-header h1 {
        font-size: 2rem;
        font-weight: 700;
        background: linear-gradient(135deg, #6C63FF, #B794F6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.25rem;
    }
    .app-header p {
        color: #495057;
        font-size: 0.95rem;
        margin: 0;
    }

    /* ---- Sidebar ---- */
    section[data-testid="stSidebar"] .stMarkdown h2 {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #495057;
        font-weight: 600;
        margin-bottom: 0.75rem;
    }
    .sidebar-query-item {
        padding: 0.5rem 0.75rem;
        margin: 0.25rem 0;
        border-radius: 8px;
        background: #FFFFFF;
        border: 1px solid #DEE2E6;
        font-size: 0.82rem;
        color: #495057;
        transition: background 0.2s;
    }
    .sidebar-query-item:hover {
        background: #E9ECEF;
    }
    .sidebar-query-num {
        color: #6C63FF;
        font-weight: 600;
        margin-right: 0.4rem;
    }

    /* ---- Chat messages ---- */
    .stChatMessage {
        border-radius: 12px !important;
        padding: 1rem !important;
        margin-bottom: 0.75rem !important;
    }

    /* ---- Metric card styling ---- */
    .metric-card {
        background: #F8F9FA;
        border: 1px solid #DEE2E6;
        border-radius: 16px;
        padding: 2rem;
        text-align: center;
        margin: 1rem 0;
    }
    .metric-card .metric-value {
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #6C63FF, #B794F6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0.5rem 0;
    }
    .metric-card .metric-label {
        font-size: 0.9rem;
        color: #495057;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* ---- Validation badge ---- */
    .validation-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        margin: 0.25rem 0;
    }
    .validation-badge.valid {
        background: rgba(16, 185, 129, 0.08);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .validation-badge.expensive {
        background: rgba(245, 158, 11, 0.08);
        color: #D97706;
        border: 1px solid rgba(245, 158, 11, 0.35);
    }

    /* ---- Metadata caption ---- */
    .meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        padding: 0.5rem 0;
        margin-top: 0.5rem;
        border-top: 1px solid #DEE2E6;
    }
    .meta-item {
        font-size: 0.78rem;
        color: #6C757D;
    }
    .meta-item .meta-label {
        color: #495057;
        margin-right: 0.25rem;
    }

    /* ---- Results table ---- */
    .stDataFrame {
        border-radius: 8px !important;
        overflow: hidden;
    }

    /* ---- Clear session button ---- */
    section[data-testid="stSidebar"] button[kind="secondary"] {
        width: 100%;
        border-radius: 8px;
        border: 1px solid #DEE2E6;
        background: transparent;
        color: #6C757D;
        font-size: 0.82rem;
        transition: all 0.2s;
    }
    section[data-testid="stSidebar"] button[kind="secondary"]:hover {
        border-color: #EF4444;
        color: #EF4444;
        background: rgba(239, 68, 68, 0.05);
    }

    /* ---- Welcome state ---- */
    .welcome-container {
        text-align: center;
        padding: 3rem 1rem;
    }
    .welcome-container h3 {
        color: #1A1D23;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }
    .welcome-container p {
        color: #6C757D;
        font-size: 0.9rem;
    }

    /* ---- Hide deploy button and header ---- */
    .stDeployButton {
        display: none !important;
    }
    #MainMenu {
        visibility: hidden;
    }
    header[data-testid="stHeader"] {
        visibility: hidden;
        height: 0;
    }
    </style>
    """, unsafe_allow_html=True)
