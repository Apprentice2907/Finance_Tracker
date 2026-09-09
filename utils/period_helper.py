import calendar
import datetime
from typing import Tuple, Optional, Dict

PERIOD_OPTIONS = [
    ("today", "Today"),
    ("yesterday", "Yesterday"),
    ("this_week", "This Week"),
    ("last_week", "Last Week"),
    ("this_month", "This Month"),
    ("last_month", "Last Month"),
    ("this_year", "This Year"),
    ("last_year", "Last Year"),
    ("custom", "Custom Range"),
]

def get_period_dates(period_key: str, custom_start: Optional[str] = None, custom_end: Optional[str] = None) -> Tuple[str, str, str]:
    """
    Returns (start_date, end_date, human_label) as strings in 'YYYY-MM-DD'.
    Handles month/year boundaries, leap years, and Monday-Sunday week conventions.
    """
    today = datetime.date.today()

    if period_key == "today":
        d_str = today.strftime("%Y-%m-%d")
        return d_str, d_str, f"Today ({today.strftime('%d %b')})"

    elif period_key == "yesterday":
        yday = today - datetime.timedelta(days=1)
        d_str = yday.strftime("%Y-%m-%d")
        return d_str, d_str, f"Yesterday ({yday.strftime('%d %b')})"

    elif period_key == "this_week":
        # Monday is 0, Sunday is 6
        start = today - datetime.timedelta(days=today.weekday())
        end = start + datetime.timedelta(days=6)
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), f"This Week ({start.strftime('%d %b')} - {end.strftime('%d %b')})"

    elif period_key == "last_week":
        this_monday = today - datetime.timedelta(days=today.weekday())
        last_monday = this_monday - datetime.timedelta(days=7)
        last_sunday = last_monday + datetime.timedelta(days=6)
        return last_monday.strftime("%Y-%m-%d"), last_sunday.strftime("%Y-%m-%d"), f"Last Week ({last_monday.strftime('%d %b')} - {last_sunday.strftime('%d %b')})"

    elif period_key == "this_month":
        year, month = today.year, today.month
        last_day = calendar.monthrange(year, month)[1]
        start = datetime.date(year, month, 1)
        end = datetime.date(year, month, last_day)
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), today.strftime("%B %Y")

    elif period_key == "last_month":
        year, month = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
        last_day = calendar.monthrange(year, month)[1]
        start = datetime.date(year, month, 1)
        end = datetime.date(year, month, last_day)
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), f"{calendar.month_name[month]} {year}"

    elif period_key == "this_year":
        start = datetime.date(today.year, 1, 1)
        end = datetime.date(today.year, 12, 31)
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), f"Year {today.year}"

    elif period_key == "last_year":
        year = today.year - 1
        start = datetime.date(year, 1, 1)
        end = datetime.date(year, 12, 31)
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), f"Year {year}"

    elif period_key == "custom" and custom_start and custom_end:
        try:
            s_dt = datetime.datetime.strptime(custom_start, "%Y-%m-%d").date()
            e_dt = datetime.datetime.strptime(custom_end, "%Y-%m-%d").date()
            return custom_start, custom_end, f"{s_dt.strftime('%d %b %Y')} - {e_dt.strftime('%d %b %Y')}"
        except ValueError:
            pass

    # Default fallback to This Month
    year, month = today.year, today.month
    last_day = calendar.monthrange(year, month)[1]
    return f"{year}-{month:02d}-01", f"{year}-{month:02d}-{last_day:02d}", today.strftime("%B %Y")


def get_previous_period_dates(period_key: str, start_date: str, end_date: str) -> Tuple[str, str, str]:
    """
    Returns the comparison baseline date range (prev_start, prev_end, prev_label)
    for period comparison indicators.
    """
    s_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d").date()
    e_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()

    if period_key == "today":
        prev = s_dt - datetime.timedelta(days=1)
        return prev.strftime("%Y-%m-%d"), prev.strftime("%Y-%m-%d"), "vs Yesterday"

    elif period_key == "yesterday":
        prev = s_dt - datetime.timedelta(days=1)
        return prev.strftime("%Y-%m-%d"), prev.strftime("%Y-%m-%d"), "vs Prev Day"

    elif period_key == "this_week":
        prev_s = s_dt - datetime.timedelta(days=7)
        prev_e = e_dt - datetime.timedelta(days=7)
        return prev_s.strftime("%Y-%m-%d"), prev_e.strftime("%Y-%m-%d"), "vs Last Week"

    elif period_key == "last_week":
        prev_s = s_dt - datetime.timedelta(days=7)
        prev_e = e_dt - datetime.timedelta(days=7)
        return prev_s.strftime("%Y-%m-%d"), prev_e.strftime("%Y-%m-%d"), "vs Prior Week"

    elif period_key == "this_month":
        year, month = (s_dt.year, s_dt.month - 1) if s_dt.month > 1 else (s_dt.year - 1, 12)
        last_day = calendar.monthrange(year, month)[1]
        prev_s = datetime.date(year, month, 1)
        prev_e = datetime.date(year, month, last_day)
        return prev_s.strftime("%Y-%m-%d"), prev_e.strftime("%Y-%m-%d"), "vs Last Month"

    elif period_key == "last_month":
        year, month = (s_dt.year, s_dt.month - 1) if s_dt.month > 1 else (s_dt.year - 1, 12)
        last_day = calendar.monthrange(year, month)[1]
        prev_s = datetime.date(year, month, 1)
        prev_e = datetime.date(year, month, last_day)
        return prev_s.strftime("%Y-%m-%d"), prev_e.strftime("%Y-%m-%d"), f"vs {calendar.month_abbr[month]} {year}"

    elif period_key in ("this_year", "last_year"):
        prev_s = datetime.date(s_dt.year - 1, 1, 1)
        prev_e = datetime.date(s_dt.year - 1, 12, 31)
        return prev_s.strftime("%Y-%m-%d"), prev_e.strftime("%Y-%m-%d"), f"vs {s_dt.year - 1}"

    else:
        # Custom range duration matching
        duration_days = (e_dt - s_dt).days + 1
        prev_e = s_dt - datetime.timedelta(days=1)
        prev_s = prev_e - datetime.timedelta(days=duration_days - 1)
        return prev_s.strftime("%Y-%m-%d"), prev_e.strftime("%Y-%m-%d"), "vs Prior Period"
