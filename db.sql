PGDMP                     
    t            chess    9.6.1    9.6.1     U           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                       false            V           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                       false            W           1262    16393    chess    DATABASE     �   CREATE DATABASE chess WITH TEMPLATE = template0 ENCODING = 'UTF8' LC_COLLATE = 'English_United States.1252' LC_CTYPE = 'English_United States.1252';
    DROP DATABASE chess;
             postgres    false                        2615    2200    public    SCHEMA        CREATE SCHEMA public;
    DROP SCHEMA public;
             postgres    false            X           0    0    SCHEMA public    COMMENT     6   COMMENT ON SCHEMA public IS 'standard public schema';
                  postgres    false    3                        3079    12387    plpgsql 	   EXTENSION     ?   CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;
    DROP EXTENSION plpgsql;
                  false            Y           0    0    EXTENSION plpgsql    COMMENT     @   COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';
                       false    1            �            1259    16407    game_results    TABLE     �   CREATE TABLE game_results (
    id bigint NOT NULL,
    first_player bigint,
    second_player bigint,
    result integer,
    history text
);
     DROP TABLE public.game_results;
       public         postgres    false    3            �            1259    16405    game_results_id_seq    SEQUENCE     u   CREATE SEQUENCE game_results_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public.game_results_id_seq;
       public       postgres    false    3    187            Z           0    0    game_results_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE game_results_id_seq OWNED BY game_results.id;
            public       postgres    false    186            �            1259    16394    users    TABLE     /   CREATE TABLE users (
    id bigint NOT NULL
);
    DROP TABLE public.users;
       public         postgres    false    3            �           2604    16410    game_results id    DEFAULT     d   ALTER TABLE ONLY game_results ALTER COLUMN id SET DEFAULT nextval('game_results_id_seq'::regclass);
 >   ALTER TABLE public.game_results ALTER COLUMN id DROP DEFAULT;
       public       postgres    false    186    187    187            R          0    16407    game_results 
   TABLE DATA               Q   COPY game_results (id, first_player, second_player, result, history) FROM stdin;
    public       postgres    false    187   Y       [           0    0    game_results_id_seq    SEQUENCE SET     :   SELECT pg_catalog.setval('game_results_id_seq', 4, true);
            public       postgres    false    186            P          0    16394    users 
   TABLE DATA                  COPY users (id) FROM stdin;
    public       postgres    false    185   �       �           2606    16415    game_results game_results_pkey 
   CONSTRAINT     U   ALTER TABLE ONLY game_results
    ADD CONSTRAINT game_results_pkey PRIMARY KEY (id);
 H   ALTER TABLE ONLY public.game_results DROP CONSTRAINT game_results_pkey;
       public         postgres    false    187    187            �           2606    16400    users users_pkey 
   CONSTRAINT     G   ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public         postgres    false    185    185            R   K   x��̫�  @�����K�,��3TTb��N@X���qF���*3.ɞ�n�1Q%-��V�D��^����A�o�"�      P   ,   x��� 0�?��P��.��&v�m:��%�4s����w |�CE     