<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const comments = ref([]);
const newText = ref('');
const newName = ref(localStorage.getItem('name') ?? '');  // имя из прошлого раза, если есть
const replyTo = ref(null);                                  // на какой комментарий отвечаем (или null)
const listEl = ref(null);
const textInput = ref(null);                                // поле текста — чтобы поставить в него курсор

async function addComment() {
  if (newText.value.trim() === '') return;

  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: newText.value,
      name: newName.value,
      parent_id: replyTo.value?.id ?? null,
    }),
  });
  if (!res.ok) return;

  const newComment = await res.json();
  localStorage.setItem('key-' + newComment.id, newComment.key);
  localStorage.setItem('name', newName.value);

  newText.value = '';
  replyTo.value = null;
  await loadComments();
}

async function removeComment(id) {
  const key = localStorage.getItem('key-' + id);

  const res = await fetch('/api/comments/' + id, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: key }),
  });
  if (!res.ok) return;

  localStorage.removeItem('key-' + id);
  await loadComments();
}

function startReply(comment) {
  replyTo.value = { id: comment.id, author_name: comment.author_name };
  textInput.value.focus();   // поставить курсор в поле текста
}

function renderComment(comment, container) {
  const li = document.createElement('li');
  li.className = 'comment';

  // Шапка: имя, значок автора, дата
  const head = document.createElement('div');
  head.className = 'comment-head';

  const name = document.createElement('strong');
  name.textContent = comment.author_name;
  head.appendChild(name);

  if (comment.is_admin === 1) {
    const badge = document.createElement('span');
    badge.className = 'comment-badge';
    badge.textContent = '✦ автор';
    head.appendChild(badge);
  }

  const small = document.createElement('small');
  const date = new Date(comment.created_at);
  small.textContent = date.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  head.appendChild(small);
  li.appendChild(head);

  // Текст
  const text = document.createElement('div');
  text.className = 'comment-text';
  text.textContent = comment.text;
  li.appendChild(text);

  // Кнопки
  const actions = document.createElement('div');
  actions.className = 'comment-actions';

  if (comment.parent_id === null) {
    const replyBtn = document.createElement('button');
    replyBtn.textContent = 'Ответить';
    replyBtn.addEventListener('click', () => startReply(comment));
    actions.appendChild(replyBtn);
  }

  if (localStorage.getItem('key-' + comment.id)) {
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => removeComment(comment.id));
    actions.appendChild(delBtn);
  }
  li.appendChild(actions);

  // Ответы на этот комментарий — свой вложенный список
  const replies = comments.value.filter((c) => c.parent_id === comment.id);
  if (replies.length > 0) {
    const repliesUl = document.createElement('ul');
    repliesUl.className = 'comment-replies';
    for (const reply of replies) {
      renderComment(reply, repliesUl);   // рекурсия: рисуем ответ внутрь списка ответов
    }
    li.appendChild(repliesUl);
  }

  container.appendChild(li);
}

async function loadComments() {
  const res = await fetch('/api/comments');
  if (!res.ok) return;
  const data = await res.json();
  if (!listEl.value) return;

  comments.value = data;
  listEl.value.replaceChildren();
  for (const comment of data) {
    if (comment.parent_id === null) {     // в основной список — только комментарии, не ответы
      renderComment(comment, listEl.value);
    }
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
      <p v-if="replyTo">
        Ответ для {{ replyTo.author_name }}
        <button type="button" @click="replyTo = null">отменить</button>
      </p>
      <input v-model="newName" placeholder="Ваше имя" maxlength="40">
      <input ref="textInput" v-model="newText" placeholder="Комментарий">
      <button>Отправить</button>
    </form>

    <p v-if="comments.length === 0">Пока нет комментариев</p>
    <ul ref="listEl"></ul>
  </div>
</template>