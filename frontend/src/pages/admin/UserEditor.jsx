import { useMemo, useState } from 'react';

const EDITABLE_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'nickname', label: 'Nickname' },
  { key: 'leaseLoons', label: 'Set Loons', type: 'number' }
];

export default function UserEditor({
  users,
  showUsers,
  setShowUsers,
  updateUser,
  addLoons,
  deleteUser
}) {
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');

  const activeUser = useMemo(
    () => users.find((u) => u.deviceId === editing?.deviceId),
    [users, editing]
  );

  const openEditor = (user, key) => {
    setEditing({ deviceId: user.deviceId, key, mode: 'set' });
    setValue(String(user[key] ?? ''));
  };

  const openAddLoons = (user) => {
    setEditing({ deviceId: user.deviceId, key: 'leaseLoons', mode: 'add' });
    setValue('50');
  };

  const save = async () => {
    if (!editing) return;

    if (editing.mode === 'add') {
      await addLoons(editing.deviceId, Number(value));
    } else {
      await updateUser(editing.deviceId, {
        [editing.key]: editing.key === 'leaseLoons' ? Number(value) : value
      });
    }

    setEditing(null);
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowUsers(!showUsers)}
        className="w-full py-3 px-4 bg-gray-100 text-gray-800 rounded shadow-sm font-medium"
      >
        {showUsers ? 'Hide User Editor 👥' : 'Manage Users 👥'}
      </button>

      {showUsers && (
        <div className="mt-4 overflow-x-auto border rounded shadow-sm bg-white">
          <table className="w-full min-w-[760px] text-xs text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 border">Device ID</th>
                <th className="px-3 py-2 border">First</th>
                <th className="px-3 py-2 border">Last</th>
                <th className="px-3 py-2 border">Nickname</th>
                <th className="px-3 py-2 border">Loons</th>
                <th className="px-3 py-2 border">Add Loons</th>
                <th className="px-3 py-2 border">Delete</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.deviceId} className="odd:bg-gray-50 even:bg-white">
                  <td className="px-3 py-1 border break-all">{u.deviceId}</td>
                  {EDITABLE_FIELDS.map((field) => (
                    <td key={`${u.deviceId}-${field.key}`} className="px-3 py-1 border">
                      <button
                        type="button"
                        className="underline decoration-dotted hover:text-blue-700"
                        onClick={() => openEditor(u, field.key)}
                      >
                        {String(u[field.key] ?? '—')}
                      </button>
                    </td>
                  ))}
                  <td className="px-3 py-1 border">
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-emerald-600 text-white"
                      onClick={() => openAddLoons(u)}
                    >
                      + Add
                    </button>
                  </td>
                  <td className="px-3 py-1 border">
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-red-600 text-white"
                      onClick={() => deleteUser?.(u.deviceId)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && activeUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl w-[420px] max-w-[95vw] p-4 space-y-3">
            <h3 className="font-bold text-lg">
              {editing.mode === 'add' ? 'Add Lease Loons' : `Edit ${editing.key}`}
            </h3>
            <p className="text-xs text-gray-500">Device ID: {editing.deviceId}</p>
            <input
              className="w-full border rounded px-3 py-2"
              type={editing.key === 'leaseLoons' ? 'number' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setEditing(null)}>Cancel</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
