import flet as ft

# Central color palette and design tokens
BG = "#F7F8FA"
CARD = "#FFFFFF"
TEXT = "#18212F"
MUTED = "#7A8494"
BORDER = "#E7EAF0"
BLUE = "#2962D6"
BLUE_LIGHT = "#EAF1FF"
GREEN = "#159B72"
GREEN_LIGHT = "#E6F6F1"
RED = "#D65B67"
RED_LIGHT = "#FDECEE"
AMBER = "#E59819"

BREAKPOINT_MOBILE = 600
BREAKPOINT_TABLET = 1024

def get_page_width(page: ft.Page) -> float:
    return page.width if page.width is not None and page.width > 0 else 1120

def is_mobile(page: ft.Page) -> bool:
    return get_page_width(page) < BREAKPOINT_MOBILE

def is_tablet(page: ft.Page) -> bool:
    w = get_page_width(page)
    return BREAKPOINT_MOBILE <= w < BREAKPOINT_TABLET

def is_desktop(page: ft.Page) -> bool:
    return get_page_width(page) >= BREAKPOINT_TABLET

def soft_color(color_hex: str) -> str:
    """Returns a pale tint with 15% opacity for background badges."""
    clean = color_hex.lstrip("#")
    return f"#20{clean}"

def padding_box(horizontal=0, vertical=0, top=None, bottom=None, left=None, right=None):
    return ft.Padding(
        left=left if left is not None else horizontal,
        right=right if right is not None else horizontal,
        top=top if top is not None else vertical,
        bottom=bottom if bottom is not None else vertical
    )

def card_border(color=BORDER, width=1):
    side = ft.BorderSide(width, color)
    return ft.Border(left=side, top=side, right=side, bottom=side)

def format_currency(value: float) -> str:
    if value is None:
        return "₹0.00"
    return f"₹{value:,.2f}"

def format_currency_compact(value: float) -> str:
    if value is None:
        return "₹0"
    abs_val = abs(value)
    sign = "-" if value < 0 else ""
    if abs_val >= 10000000:
        return f"{sign}₹{abs_val/10000000:.2f}Cr"
    if abs_val >= 100000:
        return f"{sign}₹{abs_val/100000:.2f}L"
    if abs_val >= 1000:
        return f"{sign}₹{abs_val/1000:.1f}k"
    return f"{sign}₹{abs_val:,.0f}"

def format_percent_change(current: float, previous: float):
    """
    Returns (label, color, icon) safely handling zero previous value.
    """
    if previous is None or previous == 0:
        if current > 0:
            return ("New activity", BLUE, ft.Icons.TRENDING_FLAT)
        return ("No prior data", MUTED, ft.Icons.REMOVE_ROUNDED)
    
    pct = ((current - previous) / abs(previous)) * 100
    if abs(pct) < 0.05:
        return ("0.0%", MUTED, ft.Icons.TRENDING_FLAT)
    elif pct > 0:
        return (f"+{pct:.1f}%", GREEN, ft.Icons.ARROW_UPWARD_ROUNDED)
    else:
        return (f"{pct:.1f}%", RED, ft.Icons.ARROW_DOWNWARD_ROUNDED)
