import toast from 'react-hot-toast';

export const toastConfirm = (message, onConfirm) => {
  toast((t) => (
    <div className="flex flex-col gap-3 min-w-[250px]">
      <p className="font-medium text-gray-800 dark:text-gray-200">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onConfirm();
          }}
          className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition"
        >
          Confirmar
        </button>
      </div>
    </div>
  ), {
    duration: 5000,
    position: 'top-center',
  });
};
