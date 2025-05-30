// File: frontend/src/pages/admin/UserEditor.jsx
// Version: v2.2.7 — Extract User editor into its own component
// Date: 2025-05-28

export default function UserEditor({
  users,
  showUsers,
  setShowUsers,
  updateUser
}) {
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
          <table className="w-full min-w-[600px] text-xs text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 border">Device ID</th>
                <th className="px-3 py-2 border">First</th>
                <th className="px-3 py-2 border">Last</th>
                <th className="px-3 py-2 border">Nickname</th>
                <th className="px-3 py-2 border">Loons</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.deviceId} className="odd:bg-gray-50 even:bg-white">
                  <td className="px-3 py-1 border break-all">{u.deviceId}</td>
                  <td className="px-3 py-1 border">
                    <input
                      className="w-full bg-transparent border border-gray-300 rounded px-1"
                      defaultValue={u.firstName}
                      onBlur={(e) => updateUser(u.deviceId, { firstName: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1 border">
                    <input
                      className="w-full bg-transparent border border-gray-300 rounded px-1"
                      defaultValue={u.lastName}
                      onBlur={(e) => updateUser(u.deviceId, { lastName: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1 border">
                    <input
                      className="w-full bg-transparent border border-gray-300 rounded px-1"
                      defaultValue={u.nickname}
                      onBlur={(e) => updateUser(u.deviceId, { nickname: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1 border">
                    <input
                      className="w-16 bg-transparent border border-gray-300 rounded px-1 text-right"
                      type="number"
                      inputMode="numeric"
                      defaultValue={u.leaseLoons}
                      onBlur={(e) => updateUser(u.deviceId, { leaseLoons: parseInt(e.target.value) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
