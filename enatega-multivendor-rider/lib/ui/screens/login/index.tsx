// Core
import { Formik } from "formik";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

// React Native
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Icon
import { FontAwesome6 } from '@expo/vector-icons';

// Schemas
import { SignInSchema } from "@/lib/utils/schema";
import { useTranslation } from "react-i18next";

// Hooks
import useLogin from "@/lib/hooks/useLogin";

// Interface
import { useApolloClient } from "@apollo/client";
import { ILoginInitialValues } from "@/lib/utils/interfaces";
import { APP_ROLE } from "@/lib/utils/app-role";

const JEDZ_COLOR = '#00A8FF';
const TO_COLOR = '#00E676';
const PAGE = '#121212';
const SURFACE = '#1C1C1E';
const MUTED = '#8E8E93';
const BORDER = '#3A3A3C';
const ERROR = '#FF453A';

const initial: ILoginInitialValues = {
  username: "owner1@jedzto.local",
  password: "owner1234",
};

const LoginScreen = () => {
  // States
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [initialValues, setInitialValues] = useState(initial);

  // Hooks
  const client = useApolloClient();
  const { t } = useTranslation();
  const { onLogin, creds } = useLogin();
  const [loading, setLoading] = useState(false);

  // Handlers
  const onLoginHandler = async (creds: ILoginInitialValues) => {
    try {
      setLoading(true);
      await onLogin(creds.username.toLowerCase(), creds.password);
    } catch (err: unknown) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const onInit = () => {
    try {
      client
        ?.clearStore()
        .catch((err) => console.log("Apollo clearStore error:", err));

      if (!creds?.username) return;
      setInitialValues({
        username: creds.username,
        password: creds.password || initial.password,
      });
    } catch (err) {
      console.log("error login", err);
    }
  };

  // Use Effect
  useEffect(() => {
    onInit();
  }, [creds]);

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-center"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ backgroundColor: PAGE }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        >
          <Formik
            initialValues={initialValues}
            enableReinitialize={true}
            validationSchema={SignInSchema}
            onSubmit={onLoginHandler}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors }) => {
              return (
                <View className="flex-1 items-center justify-center px-4 py-10 w-full">
                  <View className="w-full max-w-[560px] items-center">
                    
                    <View className="mb-10 items-center text-center">
                      <View className="flex-row mb-6">
                        <Text style={{ color: JEDZ_COLOR, fontSize: 60, fontWeight: "900", lineHeight: 60, letterSpacing: -1 }}>Jedz</Text>
                        <Text style={{ color: TO_COLOR, fontSize: 60, fontWeight: "900", lineHeight: 60, letterSpacing: -1 }}>To</Text>
                      </View>
                      <Text className="text-xl font-semibold text-center text-white sm:text-2xl max-w-[420px]">
                        {APP_ROLE === 'delivery'
                          ? 'Witaj w aplikacji kierowcy'
                          : 'Witaj w aplikacji kuchni'}
                      </Text>
                    </View>

                    <View
                      className="w-full rounded-2xl border p-6 sm:p-10"
                      style={{
                        backgroundColor: SURFACE,
                        borderColor: '#2C2C2E',
                      }}
                    >
                      <View className="mb-8 items-center">
                        <Text className="text-base text-center leading-relaxed" style={{ color: MUTED }}>
                          Aby kontynuować wpisz swoje dane poniżej
                        </Text>
                      </View>

                      <View className="flex-col gap-y-5">
                        <View className="flex-col gap-y-2">
                          <Text className="text-sm font-medium" style={{ color: MUTED }}>
                            Login
                          </Text>
                          <TextInput
                            style={{
                              width: '100%',
                              height: 56,
                              borderRadius: 12,
                              borderWidth: 1.5,
                              borderColor: BORDER,
                              backgroundColor: PAGE,
                              color: '#fff',
                              fontSize: 16,
                              paddingHorizontal: 16,
                            }}
                            placeholder=""
                            placeholderTextColor={MUTED}
                            keyboardType="email-address"
                            inputMode="email"
                            value={values.username}
                            onChangeText={handleChange("username")}
                            onBlur={handleBlur("username")}
                          />
                          {errors.username && (
                            <Text className="mt-1 text-sm text-center" style={{ color: ERROR }}>
                              {errors?.username}
                            </Text>
                          )}
                        </View>

                        <View className="flex-col gap-y-2">
                          <Text className="text-sm font-medium" style={{ color: MUTED }}>
                            {t("Password")}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              width: '100%',
                              height: 56,
                              borderRadius: 12,
                              borderWidth: 1.5,
                              borderColor: BORDER,
                              backgroundColor: PAGE,
                              alignItems: 'stretch',
                              overflow: 'hidden',
                            }}
                          >
                            <TextInput
                              style={{
                                flex: 1,
                                height: '100%',
                                color: '#fff',
                                fontSize: 16,
                                paddingHorizontal: 16,
                              }}
                              placeholder=""
                              secureTextEntry={!passwordVisible}
                              placeholderTextColor={MUTED}
                              value={values.password}
                              onChangeText={handleChange("password")}
                              onBlur={handleBlur("password")}
                            />
                            <TouchableOpacity
                              onPress={() => setPasswordVisible(!passwordVisible)}
                              style={{
                                width: 56,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderLeftWidth: 1,
                                borderLeftColor: BORDER,
                              }}
                            >
                              <FontAwesome6
                                name={passwordVisible ? "eye-slash" : "eye"}
                                size={18}
                                color={MUTED}
                              />
                            </TouchableOpacity>
                          </View>
                          {errors.password && (
                            <Text className="mt-1 text-sm text-center" style={{ color: ERROR }}>
                              {errors?.password}
                            </Text>
                          )}
                        </View>

                        <TouchableOpacity
                          disabled={loading}
                          onPress={() => handleSubmit()}
                          touchSoundDisabled
                          style={{
                            marginTop: 12,
                            height: 56,
                            width: '100%',
                            borderRadius: 12,
                            backgroundColor: JEDZ_COLOR,
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: loading ? 0.7 : 1,
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                            {loading ? "Logowanie..." : "Zaloguj się"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          </Formik>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
