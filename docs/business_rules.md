# Bodax SACCO Business Rules

This document outlines the current business rules implemented in the Bodax SACCO application for core financial workflows.

## 1. Savings
- **Deposits**: Savings can be deposited by members. The Treasurer records these transactions in the system.
- **Statements**: Members can view a statement of their savings over a selected date range.
- **Tracking**: Total savings, weekly savings, and monthly savings are calculated and displayed on member and treasurer dashboards.
- **Confirmation**: All recorded savings send a confirmation to the member. Currently, members receive notifications regarding their latest deposit.

## 2. Loans
- **Eligibility**: Members can request loans through the member portal. Eligibility is dynamically determined based on past savings, existing active loans, and account standing.
- **Approval Workflow**:
  - Member submits a request (Amount, Purpose, Installments, Due Date).
  - Status becomes `pending`.
  - Treasurer reviews the request and either `approves` or `rejects` it.
  - Approved requests can then be formally `issued` by the Treasurer, making the loan active.
- **Interest and Installments**: Loans have a defined principal, interest rate (default 10%), and an installment count.
- **Repayments**: Members can pay installments. The Treasurer records repayments, updating the remaining balance. Overdue loans are tracked and visible to both members and the Treasurer.

## 3. Withdrawals
- **Requests**: Members can request to withdraw their savings.
- **Approval Workflow**: Withdrawals require Treasurer approval (`approve` or `reject`). 
- **Balance updates**: Approved withdrawals are deducted from the member's total savings balance.

## 4. Reports
- **Treasurer Reports**: Provide insights into total active members, daily/weekly/monthly collections, total active loans, and pending requests.
- **Overdue Loans**: The system flags loans whose remaining balance is greater than 0 after the scheduled due date. Days overdue and amount overdue are explicitly tracked.
