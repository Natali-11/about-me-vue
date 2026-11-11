<script setup>

//ref - специальная реактивная переменная, onMounted / onUnmounted - когда компонент появился / убран со страницы
import { ref, onMounted, onUnmounted } from 'vue';

//При изменении реактивных (ref) переменных Vue сам обновляет шаблон
const comments = ref([]); //все комментарии с сервера
const newText = ref(''); //текст в поле Комментарий
const newName = ref(localStorage.getItem('name') ?? ''); //имя запоминается в браузере, ?? '' - если его нет, то пустая строка
const replyTo = ref(null); //{ id, author_name } - кому отвечаем, или null
const listEl = ref(null); //<ul>, в который вручную добавляются комментарии
const textInput = ref(null); //поле текста — чтобы поставить в него курсор

//Сервер

//Отправить новый комментарий (или ответ) на сервер
async function addComment() {
  if (newText.value.trim() === '') return;   //trim убирает пробелы по краям - пустой текст не отправляем

  //POST-запрос: данные отправляются в теле запроса в формате JSON.
  //await - ждём ответа сервера, не замораживая страницу
  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, //сообщаем серверу, что в теле JSON
    body: JSON.stringify({ //перевод объекта в строку JSON
      text: newText.value,
      name: newName.value,
      parent_id: replyTo.value?.id ?? null, //номер комментария, если это ответ, иначе null
    }),
  });
  if (!res.ok) return; //сервер ответил ошибкой (например, 400) - ничего не делаем

  const newComment = await res.json(); //ответ сервера: созданный комментарий с id и ключом

  //Ключ приходит только автору комментария. Храним его в браузере —
  //по нему сервер разрешит удалить комментарий
  localStorage.setItem('key-' + newComment.id, newComment.key);
  localStorage.setItem('name', newName.value);

  //Очистить форму и перерисовать список
  newText.value = '';
  replyTo.value = null;
  await loadComments();
}

//Удалить свой комментарий
async function removeComment(id) {
  const key = localStorage.getItem('key-' + id); //ключ этого комментария из браузера

  //DELETE-запрос: номер комментария в адресе, ключ в теле
  const res = await fetch('/api/comments/' + id, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: key }),
  });
  if (!res.ok) return;   //сервер отказал (чужой комментарий) - ничего не меняем

  localStorage.removeItem('key-' + id); //ключ больше не нужен
  await loadComments();
}

//Загрузить все комментарии с сервера и нарисовать их
async function loadComments() {
  const res = await fetch('/api/comments'); //GET-запрос (метод по умолчанию)
  if (!res.ok) return;  //сервер не отвечает 
  const data = await res.json(); //перевод из объекта JSON в массив объектов {...}
  if (!listEl.value) return; //компонент уже убран со страницы

  comments.value = data;   //нужно для "Пока нет комментариев" и для поиска ответов

  //Очищаем список и рисуем заново - так на странице всегда актуальные данные (для каждого пользователя без перезаггрузки страницы)
  listEl.value.replaceChildren(); //убрать все <li> из <ul>
  for (const comment of data) {
    if (comment.parent_id === null) { //ответы нарисуются внутри своих комментариев
      renderComment(comment, listEl.value);
    }
  }
}

//Ответы:

//Нажали "Ответить" у комментария
function startReply(comment) {
  //Ответ всегда идёт в ветку основного комментария:
  //если это ответ - берём его родителя, если основной комментарий - его самого
  const targetId = comment.parent_id ?? comment.id;
  replyTo.value = { id: targetId, author_name: comment.author_name };   //над формой появится "Ответ для …"

  //Если отвечаем на ответ - подставляем имя, "Имя, *ответ*"
  if (comment.parent_id !== null) {
    newText.value = comment.author_name + ', ';
  }

  textInput.value.focus();   //поставить курсор в поле текста
}

//Нажали «отменить» над формой
function cancelReply() {
  replyTo.value = null;
  newText.value = '';
}

//С помощью манипуляции дерева DOM

//создаёт <li> комментария вручную (с помощью createElement / appendChild) и вставляет его в container
//везде textContent - текст посетителя выводится как текст, а не как HTML-код 
function renderComment(comment, container) {
  const li = document.createElement('li'); //создать элемент (пока его нет на странице)
  li.className = 'comment'; //то же, что class="comment" 

  //Шапка: имя, значок автора, дата
  const head = document.createElement('div');
  head.className = 'comment-head';

  const name = document.createElement('strong');
  name.textContent = comment.author_name;
  head.appendChild(name);   //вставить имя внутрь шапки

  //Значок "★ Автор" - только у ответов, написанных через Telegram-бота
  if (comment.is_admin === 1) { // проверка, что комментарий из Telegram 
    const badge = document.createElement('span');
    badge.className = 'comment-badge';
    badge.textContent = '★ Автор';
    head.appendChild(badge);  //помещаем рядом с именем внутрь шапки
  }

  //Так как сервер хранит время в UTC, toLocaleString переводит его в часовой пояс посетителя
  const small = document.createElement('small');
  const date = new Date(comment.created_at);   //перевод строки в объект-дата
  small.textContent = date.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', //без секунд
  });
  head.appendChild(small); //помещаем в шапку
  li.appendChild(head); //помещаем в комментарий шапку 

  //Текст комментария
  const text = document.createElement('div'); //создаем тег блочного типа
  text.className = 'comment-text'; //вручаем ему класс
  text.textContent = comment.text; //присваиваем текст комментария
  li.appendChild(text); //помещаем в элемент списка - комментария сообщение

  //Кнопки
  const actions = document.createElement('div');
  actions.className = 'comment-actions';

  const replyBtn = document.createElement('button');
  replyBtn.textContent = 'Ответить';
  //Передаём функцию-стрелку, а не вызов, тогда startReply сработает при клике, а не сразу
  replyBtn.addEventListener('click', () => startReply(comment));
  actions.appendChild(replyBtn); //помещаем кнопку ответить в блок действий

  //Кнопка удаления - только у своих комментариев (храним ключ в браузере).
  //Настоящая проверка на сервере
  if (localStorage.getItem('key-' + comment.id)) {
    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => removeComment(comment.id)); // сработает только при нажатии
    actions.appendChild(delBtn); //помещаем кнопку в блок действий 
  }
  li.appendChild(actions); //помещаем в комментарий блок с действиями 

  //Ответы - вложенный <ul> внутри комментария.
  //filter оставляет только комментарии, у которых parent_id равен id этого комментария.
  //renderComment вызывает сама себя, но уже с другим контейнером
  const replies = comments.value.filter((c) => c.parent_id === comment.id);
  if (replies.length > 0) {
    const repliesUl = document.createElement('ul');
    repliesUl.className = 'comment-replies';
    for (const reply of replies) {
      renderComment(reply, repliesUl);
    }
    li.appendChild(repliesUl);
  }

  container.appendChild(li); //повесить готовый <li> в дерево - только теперь он появляется на странице
}

let timer; //номер интервала

//Загрузить сразу и обновлять каждые 5 секунд: так на странице появляются
//чужие комментарии и исчезают удалённые через Telegram без перезагрузки страницы
onMounted(() => {
  loadComments();
  timer = setInterval(loadComments, 5000);
});

//Остановить обновление, когда компонент убирают со страницы
onUnmounted(() => {
  clearInterval(timer);
});


</script>

<template>
  <div class="comments">
    <h2 class="comments-title">Комментарии</h2>

    <!-- @submit-обработчик отправки формы (кнопкой или Enter)
         .prevent отменяет перезагрузку страницы при отправке формы-->
    <form class="comment-form" @submit.prevent="addComment">
      <!--v-if абзац показывается, только когда отвечаем на комментарий-->
      <p v-if="replyTo" class="reply-info">
        Ответ для {{ replyTo.author_name }}
        <button type="button" class="btn-link" @click="cancelReply">отменить</button>
      </p>

      <!-- v-model связывает поле с переменной в обе стороны (то есть вводим значение поля в переменную)
           placeholder - серая подсказка в пустом поле, maxlength - не больше 40 символов-->
      <input v-model="newName" class="name-input" placeholder="Ваше имя" maxlength="40">

      <!-- ref="textInput" — доступ к этому полю из скрипта (для focus - ставим курсор) -->
      <input ref="textInput" v-model="newText" class="text-input" placeholder="Комментарий">

      <button class="btn-primary">Отправить</button>
    </form>

    <!-- Надпись видна, только когда комментариев нет-->
    <p v-if="comments.length === 0" class="empty">Пока нет комментариев — будьте первым!</p>

    <!-- ref="listEl"-доступ к этому <ul> из скрипта-->
    <ul ref="listEl" class="comment-list"></ul>
  </div>
</template>

<style src="./CommentsBlock.css"></style>