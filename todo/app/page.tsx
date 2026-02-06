'use client';

import { useEffect, useState } from 'react';
import type { Todo, Priority } from '@/types/todo';
import TodoForm from '@/components/TodoForm';
import TodoList from '@/components/TodoList';
import PriorityFilter from '@/components/PriorityFilter';

interface TodosData {
  todos: Todo[];
  overdue: Todo[];
  pending: Todo[];
  completed: Todo[];
}

export default function Home() {
  const [todosData, setTodosData] = useState<TodosData>({
    todos: [],
    overdue: [],
    pending: [],
    completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  const fetchTodos = async () => {
    try {
      const response = await fetch('/api/todos');
      const data = await response.json();
      setTodosData(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleTodoCreated = () => {
    fetchTodos();
  };

  const handleTodoUpdated = () => {
    fetchTodos();
  };

  const handleTodoDeleted = () => {
    fetchTodos();
  };

  // Filter todos by priority
  const filterTodosByPriority = (todos: Todo[]) => {
    if (priorityFilter === 'all') return todos;
    return todos.filter(todo => todo.priority === priorityFilter);
  };

  const filteredOverdue = filterTodosByPriority(todosData.overdue);
  const filteredPending = filterTodosByPriority(todosData.pending);
  const filteredCompleted = filterTodosByPriority(todosData.completed);

  if (loading) {
    return (
      <main className="min-h-screen p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Todo App</h1>
          <p className="text-gray-600 mt-2">Manage your tasks efficiently</p>
        </header>

        <TodoForm onTodoCreated={handleTodoCreated} />

        {/* Priority Filter */}
        <div className="mt-6">
          <PriorityFilter
            selectedPriority={priorityFilter}
            onChange={setPriorityFilter}
          />
        </div>

        <div className="mt-12">
          <TodoList
            overdue={filteredOverdue}
            pending={filteredPending}
            completed={filteredCompleted}
            onTodoUpdated={handleTodoUpdated}
            onTodoDeleted={handleTodoDeleted}
          />
        </div>

        {/* Summary Stats */}
        <div className="mt-8 flex justify-center gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-red-600">
              {filteredOverdue.length}
            </div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">
              {filteredPending.length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">
              {filteredCompleted.length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>
      </div>
    </main>
  );
}
