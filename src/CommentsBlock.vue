<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const comments = ref([]);
const newText = ref('');
const listEl = ref(null);

async function addComment() {
  if (newText.value.trim() === '') return;

  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: newText.value }),
  });
  if (!res.ok) return;

  const newComment = await res.json();
  localStorage.setItem('key-' + newComment.id, newComment.key);
  comments.value.push(newComment);
  renderComment(newComment);
  newText.value = '';
}

async function removeComment(id, li) {
  const key = localStorage.getItem('key-' + id);

  const res = await fetch('/api/comments/' + id, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: key }),
  });
  if (!res.ok) return;

  comments.value = comments.value.filter((comment) => comment.id !== id);
  li.remove();
  localStorage.removeItem('key-' + id);
}

function renderComment(comment) {
  const li = document.createElement('li');
  li.textContent = comment.text;

  const small = document.createElement('small');
  const date = new Date(comment.created_at);
  small.textContent = ' ' + date.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  li.appendChild(small);

  const key = localStorage.getItem('key-' + comment.id);
  if (key) {
    const button = document.createElement('button');
    button.textContent = '✕';
    button.addEventListener('click', () => removeComment(comment.id, li));
    li.appendChild(button);
  }

  listEl.value.appendChild(li);
}

async function loadComments() {
  const res = await fetch('/api/comments');
  const data = await res.json();
  comments.value = data;
  listEl.value.replaceChildren();     
  for (const comment of data) {
    renderComment(comment);
  }
}


let timer;

onMounted(() => {
  loadComments();
  timer = setInterval(loadComments, 5000);
});

onUnmounted(() => {
  clearInterval(timer);
});

</script>

<template>
  <div>
    <h2>Комментарии</h2>
    <form @submit.prevent="addComment">
      <input v-model="newText">
      <button>Отправить</button>
    </form>
    <p v-if="comments.length === 0">Пока нет комментариев</p>
    <ul ref="listEl"></ul>
  </div>
</template>