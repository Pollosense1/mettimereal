import React, { useState } from 'react';
import './FillableTable.css';

const FillableTable = () => {
  const [rows, setRows] = useState([{ id: Date.now(), value: '' }]);

  const handleChange = (id, event) => {
    const newRows = rows.map(row => {
      if (row.id === id) {
        return { ...row, value: event.target.value };
      }
      return row;
    });
    setRows(newRows);
  };

  const addRow = () => {
    setRows([...rows, { id: Date.now(), value: '' }]);
  };

  const removeRow = (id) => {
    setRows(rows.filter(row => row.id !== id));
  };

  return (
    <div className="fillable-table">
      <h2>Fillable Table</h2>
      <table>
        <thead>
          <tr>
            <th>Input</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td>
                <input
                  type="text"
                  value={row.value}
                  onChange={(event) => handleChange(row.id, event)}
                />
              </td>
              <td>
                <button onClick={() => removeRow(row.id)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow}>Add Row</button>
    </div>
  );
};

export default FillableTable;