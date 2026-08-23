# Finance Tracker

A sleek and modern desktop personal finance tracker built with Python and Flet. 

## Features
- **Dashboard**: Visualise your income and expenses with dynamic Cash Flow and Category Pie charts.
- **Transactions**: Add, edit, and delete transactions. Categorise them seamlessly as Income or Expense.
- **Categories**: Customise your income and expense categories.
- **Local Database**: All data is stored locally in an SQLite database (`finance.db`) ensuring your data is private and secure.

## Requirements
- Python 3.8+
- [Flet](https://flet.dev/)
- [Matplotlib](https://matplotlib.org/)

## Installation

1. Clone this repository:
```bash
git clone https://github.com/Apprentice2907/Finance_Tracker.git
cd Finance_Tracker
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. Install the dependencies:
```bash
pip install flet matplotlib
```

4. Run the application:
```bash
python main.py
```

## Structure
- `main.py`: Entry point for the application.
- `db/`: Contains database setup and transaction/category logic.
- `views/`: Contains the UI logic for Dashboard, Transactions, and Categories.
- `charts/`: Contains logic for generating matplotlib charts.

## License
MIT License
