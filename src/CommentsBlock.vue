<script setup>
import { ref, onMounted } from 'vue';

const comments = ref([]);
const newText = ref('');
const listEl = ref(null);

async function addComment() {
  if (newText.value.trim() === '') return;
  const res = await fetch('/api/comments',{
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: newText.value }),
})
  const newComment = await res.json();
  comments.value.push(newComment);
  renderComment(newComment);
  newText.value = '';
}

async function removeComment(id,li){
  await fetch('/api/comments/'+id,{
  method: 'DELETE'
})
  comments.value = comments.value.filter((comment) => comment.id !== id)
  li.remove();
}

function renderComment(comment){
  const li = document.createElement('li');
  li.textContent = comment.text;
  const button = document.createElement('button');
  button.textContent = '✕';
button.addEventListener('click', () => removeComment(comment.id, li));
  li.appendChild(button);
  listEl.value.appendChild(li);
}

async function loadComments() {
  const res = await fetch('/api/comments');
  const data = await res.json();
  comments.value = data;
  for (const comment of data) {
    renderComment(comment);
  }
}

onMounted(loadComments);

</script>

<template>
  <div>
    <h2>Комментарии</h2>
    <form @submit.prevent="addComment">
    <input v-model="newText">
    <button>Отправить</button>
    </form>
    <p v-if="comments.length === 0"> Пока нет комментариев </p>
    <ul ref="listEl">

    </ul>
  </div>
</template>